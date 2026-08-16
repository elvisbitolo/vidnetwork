import { adminDb } from "@/lib/firebase/admin";
import { canModerate } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";
import { listRooms } from "@/lib/server/rooms";
import { listEvents, expandEvents, listRsvps, getEvent } from "@/lib/server/events";
import { getCourse } from "@/lib/server/courses";
import { getSpace } from "@/lib/server/spaces";
import { listConversations } from "@/lib/server/chat";
import { listNotifications } from "@/lib/server/notifications";
import { getLeaderboard, getGamification } from "@/lib/server/gamification";
import { getStripe } from "@/lib/server/stripe";
import { getUserMemberships } from "@/lib/server/dashboard";
import { listLiveParticipants } from "@/lib/server/livekit";
import {
  toMillis,
  startOfDay,
  visitKey,
  monthlyRateCents,
  summarizeSubscriptions,
  summarizePurchases,
  rankTopPosts,
} from "@/lib/server/analytics-core";

async function count(collectionName, constraint = null) {
  try {
    let query = adminDb().collection(collectionName);
    if (constraint) query = query.where(...constraint);
    const snap = await query.count().get();
    return snap.data().count;
  } catch {
    let query = adminDb().collection(collectionName);
    if (constraint) query = query.where(...constraint);
    const snap = await query.limit(1000).get();
    return snap.size;
  }
}

function canReadPostServer(post, uid, role, memberships) {
  if (role === "owner" || post.authorId === uid) return true;
  if (post.spaceId && !memberships.spaceIds.has(post.spaceId)) return false;
  if (post.groupId && !memberships.groupIds.has(post.groupId)) return false;
  return true;
}

function serializeUser(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || "Member",
    email: data.email || "",
    role: data.role || "member",
    photoURL: data.photoURL || "",
    headline: data.headline || "",
    bio: data.bio || "",
    createdAt: toMillis(data.createdAt),
  };
}

export async function getDashboardStats(uid, userDoc) {
  const isStaff = canModerate(userDoc);

  const now = Date.now();
  const since30 = startOfDay(30);
  const [membersTotal, newMembers30, activeRooms, active7] = await Promise.all([
    count("users"),
    count("users", ["createdAt", ">=", new Date(since30)]),
    adminDb().collection("rooms").where("status", "==", "active").get(),
    count("gamification", ["lastVisitDate", ">=", visitKey(7)]),
  ]);

  let liveViewers = 0;
  const activeRoomList = activeRooms.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (activeRoomList.length > 0) {
    const counts = await Promise.all(
      activeRoomList.slice(0, 10).map(async (room) => {
        try {
          return (await listLiveParticipants(room.slug)).length;
        } catch {
          return 0;
        }
      })
    );
    liveViewers = counts.reduce((sum, n) => sum + n, 0);
  }

  let revenue = null;
  if (isStaff) {
    try {
      const [subsSnap, purchasesSnap] = await Promise.all([
        adminDb().collection("subscriptions").get(),
        adminDb()
          .collection("purchases")
          .where("purchasedAt", ">=", new Date(since30))
          .get(),
      ]);
      let priceMap = {};
      try {
        const stripe = getStripe();
        const prices = await stripe.prices.list({ limit: 100, active: true });
        priceMap = {};
        prices.data.forEach((price) => {
          priceMap[price.id] = {
            unitAmountCents: price.unit_amount || 0,
            interval: price.recurring?.interval,
          };
        });
      } catch {
        priceMap = {};
      }
      const subs = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const subsSummary = summarizeSubscriptions(subs, priceMap, now);

      const purchasesWithPrice = await Promise.all(
        purchasesSnap.docs.map(async (doc) => {
          const data = doc.data();
          const loader =
            data.targetType === "course"
              ? getCourse
              : data.targetType === "event"
                ? getEvent
                : getSpace;
          let priceCents = null;
          try {
            const item = await loader(data.targetId);
            priceCents = Number(item?.purchasePriceCents) || 0;
          } catch {
            priceCents = null;
          }
          return { targetType: data.targetType, targetId: data.targetId, priceCents };
        })
      );
      const purchasesSummary = summarizePurchases(purchasesWithPrice);
      revenue = {
        activeSubs: subsSummary.active,
        estMonthlyCents: subsSummary.estimatedMonthlyCents,
        revenue30Cents: purchasesSummary.revenueCents,
        purchases30: purchasesSummary.total,
      };
    } catch {
      revenue = null;
    }
  }

  const contributing = await countUsersContributing(since30);

  return {
    members: { total: membersTotal, new30: newMembers30 },
    live: { rooms: activeRoomList.length, viewers: liveViewers },
    revenue,
    engagement: { active7, contributing, contributionRate: membersTotal ? Math.round((contributing / membersTotal) * 100) : 0 },
  };
}

async function countUsersContributing(since) {
  const snap = await adminDb()
    .collection("posts")
    .where("createdAt", ">=", new Date(since))
    .limit(1000)
    .get();
  const authors = new Set(snap.docs.map((d) => d.data().authorId).filter(Boolean));
  return authors.size;
}

export async function getAudienceSeries(days) {
  const start = startOfDay(days - 1);
  const end = startOfDay(0);
  const dayMs = 24 * 60 * 60 * 1000;

  const buckets = new Array(days).fill(0).map((_, i) => ({
    day: end - (days - 1 - i) * dayMs,
    membersNew: 0,
    activity: 0,
  }));
  const indexFor = (t) => {
    const i = Math.floor((t - start) / dayMs);
    return i >= 0 && i < days ? i : -1;
  };

  const [usersSnap, postsSnap, commentsSnap, membersBefore] = await Promise.all([
    adminDb()
      .collection("users")
      .where("createdAt", ">=", new Date(start))
      .limit(3000)
      .get(),
    adminDb()
      .collection("posts")
      .where("createdAt", ">=", new Date(start))
      .limit(4000)
      .get(),
    adminDb()
      .collectionGroup("comments")
      .where("createdAt", ">=", new Date(start))
      .limit(5000)
      .get(),
    count("users", ["createdAt", "<", new Date(start)]),
  ]);

  usersSnap.docs.forEach((doc) => {
    const i = indexFor(toMillis(doc.data().createdAt));
    if (i >= 0) buckets[i].membersNew += 1;
  });
  postsSnap.docs.forEach((doc) => {
    const i = indexFor(toMillis(doc.data().createdAt));
    if (i >= 0) buckets[i].activity += 1;
  });
  commentsSnap.docs.forEach((doc) => {
    const i = indexFor(toMillis(doc.data().createdAt));
    if (i >= 0) buckets[i].activity += 1;
  });

  let running = membersBefore;
  const series = buckets.map((b) => {
    running += b.membersNew;
    return { day: b.day, members: running, membersNew: b.membersNew, activity: b.activity };
  });

  return { series, days, startTotal: membersBefore };
}

export async function getDashboardActivity(uid, role, memberships, limit = 8) {
  const [postsSnap, usersSnap, rsvpsSnap] = await Promise.all([
    adminDb().collection("posts").orderBy("createdAt", "desc").limit(30).get(),
    adminDb().collection("users").orderBy("createdAt", "desc").limit(10).get(),
    adminDb().collection("rsvps").orderBy("createdAt", "desc").limit(10).get(),
  ]);

  const items = [];
  const visiblePosts = [];
  const spaceIds = new Set();
  const groupIds = new Set();

  for (const doc of postsSnap.docs) {
    const post = { id: doc.id, ...doc.data() };
    if (!canReadPostServer(post, uid, role, memberships)) continue;
    visiblePosts.push(post);
    if (post.spaceId) spaceIds.add(post.spaceId);
    if (post.groupId) groupIds.add(post.groupId);
  }

  const [spaceSnaps, groupSnaps] = await Promise.all([
    spaceIds.size
      ? Promise.all([...spaceIds].map((id) => adminDb().collection("spaces").doc(id).get()))
      : Promise.resolve([]),
    groupIds.size
      ? Promise.all([...groupIds].map((id) => adminDb().collection("groups").doc(id).get()))
      : Promise.resolve([]),
  ]);
  const spaceSlugs = new Map(spaceSnaps.filter((s) => s.exists).map((s) => [s.id, s.data().slug || ""]));
  const groupSlugs = new Map(groupSnaps.filter((g) => g.exists).map((g) => [g.id, g.data().slug || ""]));

  for (const post of visiblePosts) {
    items.push({
      id: `post-${post.id}`,
      kind: "post",
      actor: post.authorName || "Member",
      text: (post.text || "").slice(0, 140),
      href:
        post.spaceId && spaceSlugs.get(post.spaceId)
          ? `/spaces/${spaceSlugs.get(post.spaceId)}`
          : post.groupId && groupSlugs.get(post.groupId)
            ? `/groups/${groupSlugs.get(post.groupId)}`
            : "/feed",
      createdAt: toMillis(post.createdAt),
    });
  }

  for (const doc of usersSnap.docs) {
    const user = doc.data();
    if (!user.createdAt) continue;
    items.push({
      id: `user-${doc.id}`,
      kind: "signup",
      actor: user.name || "New member",
      text: "joined the community",
      href: "/members",
      createdAt: toMillis(user.createdAt),
    });
  }

  for (const doc of rsvpsSnap.docs) {
    const rsvp = doc.data();
    if (!rsvp.createdAt) continue;
    items.push({
      id: `rsvp-${doc.id}`,
      kind: "rsvp",
      actor: rsvp.name || "A member",
      text: "RSVP'd to an event",
      href: "/events",
      createdAt: toMillis(rsvp.createdAt),
    });
  }

  return items
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getDashboardUpcomingRooms(limit = 4) {
  const now = Date.now();
  const [rooms, events] = await Promise.all([listRooms(), listEvents()]);
  const upcomingEvents = expandEvents(events)
    .filter((event) => toMillis(event.startTime) > now)
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime))
    .slice(0, limit);

  const eventRsvpCounts = {};
  if (upcomingEvents.length > 0) {
    const lists = await Promise.all(upcomingEvents.map((event) => listRsvps(event.id)));
    upcomingEvents.forEach((event, i) => {
      eventRsvpCounts[event.id] = lists[i].length;
    });
  }

  const items = [];

  for (const room of rooms) {
    if (room.status === "active") {
      items.push({
        id: `live-${room.id}`,
        kind: "live",
        title: room.name || room.slug,
        slug: room.slug,
        startTime: null,
        rsvpCount: 0,
        href: `/rooms/${room.slug}`,
      });
    }
  }

  for (const event of upcomingEvents) {
    items.push({
      id: `event-${event.id}`,
      kind: "upcoming",
      title: event.title || "Upcoming event",
      slug: event.roomSlug || "",
      startTime: toMillis(event.startTime),
      rsvpCount: eventRsvpCounts[event.id] || 0,
      href: event.roomSlug ? `/rooms/${event.roomSlug}` : "/events",
    });
  }

  return items.slice(0, limit);
}

export async function getDashboardMessages(uid, limit = 5) {
  const conversations = await listConversations(uid);
  return conversations.slice(0, limit).map((conv) => ({
    id: conv.id,
    title: conv.title || "Chat",
    lastMessage: (conv.lastMessage || "").slice(0, 100),
    lastMessageAt: conv.lastMessageAt || conv.updatedAt || 0,
  }));
}

export async function getDashboardNotifications(uid, limit = 6) {
  return (await listNotifications(uid, limit)).map((n) => ({
    id: n.id,
    text: n.text || "",
    href: n.href || "/notifications",
    read: !!n.read,
    createdAt: toMillis(n.createdAt),
  }));
}

export async function getDashboardContent() {
  const [postsSnap, commentsSnap] = await Promise.all([
    adminDb().collection("posts").orderBy("createdAt", "desc").limit(120).get(),
    adminDb().collectionGroup("comments").limit(3000).get(),
  ]);

  const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const commentCountByPost = {};
  commentsSnap.docs.forEach((doc) => {
    const postId = doc.ref.path.split("/")[1];
    commentCountByPost[postId] = (commentCountByPost[postId] || 0) + 1;
  });

  const top = rankTopPosts(
    posts.map((post) => ({ ...post, commentCount: commentCountByPost[post.id] || 0 }))
  );

  return {
    metric: "engagement",
    items: top.slice(0, 5).map((post) => ({
      id: post.id,
      title: post.text,
      authorName: post.authorName,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      score: post.score,
      href: "/feed",
    })),
  };
}

export async function getDashboardNeedsAttention(userDoc) {
  const isStaff = canModerate(userDoc);
  const items = [];

  if (isStaff) {
    const [openReports, overdueQuestions] = await Promise.all([
      count("reports", ["status", "==", "open"]),
      count("questions", ["nextRun", "<=", new Date()]),
    ]);
    if (openReports > 0) {
      items.push({
        id: "reports",
        kind: "moderation",
        label: `${openReports} open ${openReports === 1 ? "report" : "reports"} need review`,
        href: "/admin/moderation",
      });
    }
    if (overdueQuestions > 0) {
      items.push({
        id: "questions",
        kind: "automation",
        label: `${overdueQuestions} scheduled ${overdueQuestions === 1 ? "question" : "questions"} are overdue`,
        href: "/admin/questions",
      });
    }
  }

  return items;
}

export async function getDashboardOnboarding(uid) {
  const [settings, userDoc, hasPost, hasRsvp, hasRoomEvent] = await Promise.all([
    getSettings(),
    adminDb().collection("users").doc(uid).get(),
    adminDb().collection("posts").where("authorId", "==", uid).limit(1).get(),
    adminDb().collection("rsvps").where("userId", "==", uid).limit(1).get(),
    adminDb().collection("roomEvents").where("userId", "==", uid).limit(1).get(),
  ]);

  const user = serializeUser(userDoc);
  const steps = settings.welcomeChecklist || [];

  const profileDone = !!(user.bio || user.headline || user.location);
  const doneMap = { profile: profileDone, post: !hasPost.empty, rsvp: !hasRsvp.empty, room: !hasRoomEvent.empty };

  const doneCount = steps.filter((step) => doneMap[step.key]).length;

  return {
    steps,
    doneCount,
    total: steps.length,
    complete: steps.length > 0 && doneCount === steps.length,
  };
}

async function attempt(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err?.message || "Failed to load" };
  }
}

export async function getDashboardCommandData(uid, userDoc) {
  const role = userDoc?.role || "member";
  const memberships = await getUserMemberships(uid);
  const isStaff = canModerate(userDoc);
  const gamification = await getGamification(uid, userDoc?.name || "Member");

  const user = {
    uid,
    name: userDoc?.name || userDoc?.displayName || "Member",
    email: userDoc?.email || "",
    role,
    photoURL: userDoc?.photoURL || "",
    points: Number(gamification.points) || 0,
    streak: Number(gamification.streak) || 0,
  };

  const [stats, activity, upcomingRooms, messages, content, notifications, needsAttention, onboarding, leaderboard] =
    await Promise.all([
      attempt(() => getDashboardStats(uid, userDoc)),
      attempt(() => getDashboardActivity(uid, role, memberships)),
      attempt(() => getDashboardUpcomingRooms()),
      attempt(() => getDashboardMessages(uid)),
      attempt(() => getDashboardContent()),
      attempt(() => getDashboardNotifications(uid)),
      attempt(() => getDashboardNeedsAttention(userDoc)),
      attempt(() => getDashboardOnboarding(uid)),
      isStaff ? attempt(() => getLeaderboard(5)) : Promise.resolve({ ok: true, value: [] }),
    ]);

  return {
    user,
    isStaff,
    stats,
    activity,
    upcomingRooms,
    messages,
    content,
    notifications,
    needsAttention,
    onboarding,
    leaderboard,
  };
}
