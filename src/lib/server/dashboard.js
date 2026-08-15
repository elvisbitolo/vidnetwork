import { adminDb } from "@/lib/firebase/admin";
import { listRooms } from "@/lib/server/rooms";
import { listEvents, expandEvents } from "@/lib/server/events";
import { getCourse, getCourseFull, getProgress } from "@/lib/server/courses";
import { listSpaces } from "@/lib/server/spaces";
import { listConversations } from "@/lib/server/chat";
import { listNotifications } from "@/lib/server/notifications";
import { meetsTier } from "@/lib/server/plans";
import { getLeaderboard } from "@/lib/server/gamification";

function toMillis(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  return new Date(value).getTime();
}

function isUpcoming(event, now = Date.now()) {
  return toMillis(event.startTime) > now;
}

export async function getUserMemberships(uid) {
  const [spaceSnap, groupSnap] = await Promise.all([
    adminDb().collection("spaceMembers").where("userId", "==", uid).limit(500).get(),
    adminDb().collection("groupMembers").where("userId", "==", uid).limit(500).get(),
  ]);
  return {
    spaceIds: new Set(spaceSnap.docs.map((d) => d.data().spaceId)),
    groupIds: new Set(groupSnap.docs.map((d) => d.data().groupId)),
  };
}

function canReadPostServer(post, uid, role, memberships) {
  if (role === "owner" || post.authorId === uid) return true;
  if (post.spaceId && !memberships.spaceIds.has(post.spaceId)) return false;
  if (post.groupId && !memberships.groupIds.has(post.groupId)) return false;
  return true;
}

export async function getCommunityActivity(uid, role, memberships, limit = 5) {
  const snap = await adminDb()
    .collection("posts")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();
  const posts = [];
  for (const doc of snap.docs) {
    const post = { id: doc.id, ...doc.data() };
    if (!canReadPostServer(post, uid, role, memberships)) continue;
    posts.push({
      id: post.id,
      text: post.text || "",
      authorName: post.authorName || "Member",
      kind: post.kind || "post",
      createdAt: toMillis(post.createdAt),
      href: post.spaceId ? `/spaces/${post.spaceId}` : post.groupId ? `/groups/${post.groupId}` : "/feed",
    });
    if (posts.length >= limit) break;
  }
  return posts;
}

export async function getContinueLearning(uid, tier, limit = 3) {
  const progressSnap = await adminDb()
    .collection("progress")
    .where("userId", "==", uid)
    .limit(50)
    .get();
  const rows = [];
  for (const doc of progressSnap.docs) {
    const progress = doc.data();
    const course = await getCourse(progress.courseId);
    if (!course || course.status !== "published" || !meetsTier(tier, course.requiredTier)) continue;
    const full = await getCourseFull(course.id);
    let total = 0;
    for (const mod of full.modules) {
      total += (full.lessons[mod.id] || []).length;
    }
    const done = (progress.completedLessons || []).length;
    rows.push({
      id: course.id,
      title: course.title,
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 0,
      updatedAt: toMillis(progress.updatedAt),
    });
  }
  return rows
    .filter((row) => row.done > 0)
    .sort((a, b) => b.updatedAt - (a.updatedAt || 0))
    .slice(0, limit);
}

export async function getRecommendedSpaces(uid, tier, memberships, limit = 3) {
  const spaces = await listSpaces();
  return spaces
    .filter(
      (space) =>
        !memberships.spaceIds.has(space.id) &&
        space.access !== "invite-only" &&
        meetsTier(tier, space.requiredTier)
    )
    .slice(0, limit)
    .map((space) => ({
      id: space.id,
      slug: space.slug,
      name: space.name,
      description: space.description || "",
      memberCount: 0,
    }));
}

export async function getLiveRooms(limit = 3) {
  const rooms = await listRooms();
  return rooms
    .filter((room) => room.status === "active")
    .slice(0, limit)
    .map((room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      kind: room.kind || "standard",
      maxParticipants: Number(room.maxParticipants) || 0,
    }));
}

export async function getUpcomingEvents(limit = 3) {
  const events = await listEvents();
  const expanded = expandEvents(events)
    .filter(isUpcoming)
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime))
    .slice(0, limit);
  return expanded.map((event) => ({
    id: event.id,
    title: event.title,
    startTime: toMillis(event.startTime),
    roomSlug: event.roomSlug || "",
  }));
}

export async function getRecentMessages(uid, limit = 3) {
  const conversations = await listConversations(uid);
  return conversations.slice(0, limit).map((conv) => ({
    id: conv.id,
    title: conv.title || "Chat",
    lastMessage: conv.lastMessage || "",
    updatedAt: conv.updatedAt || 0,
  }));
}

export async function getRecentNotifications(uid, limit = 5) {
  return (await listNotifications(uid, limit)).map((n) => ({
    id: n.id,
    text: n.text || "",
    href: n.href || "/notifications",
    read: !!n.read,
    createdAt: toMillis(n.createdAt),
  }));
}

export async function getDashboardData(uid, userDoc, tier) {
  const role = userDoc?.role || "member";
  const memberships = await getUserMemberships(uid);
  const [activity, learning, spaces, rooms, events, messages, notifications, leaderboard] =
    await Promise.all([
      getCommunityActivity(uid, role, memberships),
      getContinueLearning(uid, tier),
      getRecommendedSpaces(uid, tier, memberships),
      getLiveRooms(),
      getUpcomingEvents(),
      getRecentMessages(uid),
      getRecentNotifications(uid),
      getLeaderboard(3),
    ]);
  return { activity, learning, spaces, rooms, events, messages, notifications, leaderboard };
}
