import { adminDb } from "@/lib/firebase/admin";
import { getLeaderboard } from "@/lib/server/gamification";
import { getCourse } from "@/lib/server/courses";
import { getEvent } from "@/lib/server/events";
import { getSpace, getSpaceMembers } from "@/lib/server/spaces";
import { isActiveSub } from "@/lib/server/billing";
import { logError } from "@/lib/server/log";
import {
  startOfDay,
  visitKey,
  toMillis,
  summarizeSubscriptions,
  summarizePurchases,
  rankTopPosts,
  monthlyRateCents,
} from "@/lib/server/analytics-core";

async function count(collectionName) {
  try {
    const snap = await adminDb().collection(collectionName).count().get();
    return snap.data().count;
  } catch {
    const fallback = await adminDb().collection(collectionName).limit(1000).get();
    return fallback.size;
  }
}

async function countWhere(collectionName, field, op, value) {
  try {
    const snap = await adminDb()
      .collection(collectionName)
      .where(field, op, value)
      .count()
      .get();
    return snap.data().count;
  } catch {
    const fallback = await adminDb()
      .collection(collectionName)
      .where(field, op, value)
      .limit(1000)
      .get();
    return fallback.size;
  }
}

async function countCommentsSince(date) {
  const query = adminDb().collectionGroup("comments").where("createdAt", ">=", date);
  try {
    const snap = await query.count().get();
    return snap.data().count;
  } catch {
    const fallback = await query.limit(1000).get();
    return fallback.size;
  }
}

export async function getAnalytics() {
  const now = Date.now();
  const todayStart = new Date(startOfDay(0));
  const days7Ago = new Date(startOfDay(7));
  const days30Ago = new Date(startOfDay(30));
  const visit7 = visitKey(7);

  const [
    usersCount,
    signups7,
    signups30,
    active7,
    postsCount,
    posts7,
    commentsCount,
    rsvpsCount,
    coursesCount,
    lessonsCount,
    progressCount,
    subscriptionsSnap,
    purchasesSnap,
    postsSnap,
    rsvpsSnap,
    commentsSnap,
    lessonsSnap,
    progressSnap,
  ] = await Promise.all([
    count("users"),
    countWhere("users", "createdAt", ">=", days7Ago),
    countWhere("users", "createdAt", ">=", days30Ago),
    countWhere("gamification", "lastVisitDate", ">=", visit7),
    count("posts"),
    countWhere("posts", "createdAt", ">=", days7Ago),
    countCommentsSince(todayStart),
    count("rsvps"),
    count("courses"),
    count("lessons"),
    count("progress"),
    adminDb().collection("subscriptions").get(),
    adminDb().collection("purchases").get(),
    adminDb().collection("posts").get(),
    adminDb().collection("rsvps").get(),
    adminDb().collectionGroup("comments").get(),
    adminDb().collection("lessons").get(),
    adminDb().collection("progress").get(),
  ]);

  const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rsvps = rsvpsSnap.docs.map((d) => d.data());
  const lessons = lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const progressDocs = progressSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const commentCountByPost = {};
  commentsSnap.docs.forEach((doc) => {
    const postId = doc.ref.path.split("/")[1];
    commentCountByPost[postId] = (commentCountByPost[postId] || 0) + 1;
  });

  const contributors = new Set();
  posts.forEach((post) => post.authorId && contributors.add(post.authorId));
  commentsSnap.docs.forEach((doc) => {
    const authorId = doc.data().authorId;
    if (authorId) contributors.add(authorId);
  });
  rsvps.forEach((rsvp) => rsvp.userId && contributors.add(rsvp.userId));

  const rsvpMembers = new Set();
  rsvps.forEach((rsvp) => rsvp.userId && rsvpMembers.add(rsvp.userId));

  const lessonCountByCourse = {};
  lessons.forEach((lesson) => {
    if (lesson.courseId) {
      lessonCountByCourse[lesson.courseId] = (lessonCountByCourse[lesson.courseId] || 0) + 1;
    }
  });

  let completions = 0;
  progressDocs.forEach((doc) => {
    const courseId = doc.id.split("_")[0];
    const lessonCount = lessonCountByCourse[courseId] || 0;
    if (lessonCount > 0 && (doc.completedLessons || []).length >= lessonCount) {
      completions += 1;
    }
  });

  const subs = subscriptionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const priceMap = {};

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

  const topPosts = rankTopPosts(
    posts.map((post) => ({ ...post, commentCount: commentCountByPost[post.id] || 0 }))
  );

  const subscriptionSummary = summarizeSubscriptions(subs, priceMap, now);
  const purchasesSummary = summarizePurchases(purchasesWithPrice);
  const topMembers = await getLeaderboard(10);

  return {
    members: {
      total: usersCount,
      signups: { total: usersCount, last7: signups7, last30: signups30 },
      active7,
      contributing: contributors.size,
    },
    engagement: {
      posts: postsCount,
      posts7,
      comments: commentsCount,
      rsvps: rsvpsCount,
      rsvpMembers: rsvpMembers.size,
    },
    courses: {
      total: coursesCount,
      lessons: lessonsCount,
      learners: progressCount,
      completions,
      completionRate: progressCount > 0 ? Math.round((completions / progressCount) * 100) : 0,
    },
    revenue: {
      subscriptions: subscriptionSummary,
      purchases: purchasesSummary,
      recurringMonthlyCents: subscriptionSummary.estimatedMonthlyCents,
      oneTimeCents: purchasesSummary.revenueCents,
    },
    topContent: topPosts,
    topMembers,
  };
}

function monthKey(date) {
  const ms =
    date && typeof date.toMillis === "function"
      ? date.toMillis()
      : date instanceof Date
        ? date.getTime()
        : new Date(date).getTime();
  const d = new Date(Number.isFinite(ms) ? ms : NaN);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function last12Months() {
  const keys = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i -= 1) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(monthKey(m));
  }
  return keys;
}

export async function getRelevantPriceCents(targetType, targetId) {
  if (!targetType || !targetId) return 0;
  const loader =
    targetType === "course"
      ? getCourse
      : targetType === "event"
        ? getEvent
        : getSpace;
  try {
    const item = await loader(targetId);
    return Number(item?.purchasePriceCents) || 0;
  } catch {
    return 0;
  }
}

export async function getRevenueAnalytics() {
  const [subsSnap, purchasesSnap] = await Promise.all([
    adminDb().collection("subscriptions").get(),
    adminDb().collection("purchases").get(),
  ]);

  const months = last12Months();
  const buckets = {};
  months.forEach((m) => {
    buckets[m] = { subscriptions: 0, purchases: 0, total: 0, subCount: 0, purchaseCount: 0 };
  });

  subsSnap.docs.forEach((doc) => {
    const sub = doc.data();
    if (!isActiveSub(sub)) return;
    const m = monthKey(sub.currentPeriodStart ?? sub.createdAt ?? sub.trialStart);
    if (!buckets[m]) return;
    const rate = monthlyRateCents({ unitAmountCents: sub.unitAmountCents, unit_amount: sub.unitAmountCents, interval: sub.plan });
    buckets[m].subscriptions += rate;
    buckets[m].subCount += 1;
    buckets[m].total += rate;
  });

  await Promise.all(
    purchasesSnap.docs.map(async (doc) => {
      const data = doc.data();
      const m = monthKey(data.purchasedAt ?? data.createdAt);
      if (!buckets[m]) return;
      const price = await getRelevantPriceCents(data.targetType, data.targetId);
      buckets[m].purchases += price;
      buckets[m].purchaseCount += 1;
      buckets[m].total += price;
    })
  );

  return months.map((m) => ({
    month: m,
    subscriptions: buckets[m].subscriptions,
    purchases: buckets[m].purchases,
    total: buckets[m].total,
  }));
}

export async function getSpaceAnalytics(spaceId) {
  const space = await getSpace(spaceId);
  if (!space) return null;

  const members = await getSpaceMembers(spaceId);
  const memberIds = members.map((m) => m.userId);

  const [postsSnap, gamificationSnap, activitySnap] = await Promise.all([
    adminDb()
      .collection("posts")
      .where("spaceId", "==", spaceId)
      .get()
      .catch((err) => {
        logError("space_analytics.posts_failed", { error: err.message, spaceId });
        return { docs: [] };
      }),
    memberIds.length
      ? adminDb()
          .collection("gamification")
          .where("__name__", "in", memberIds.slice(0, 30))
          .get()
          .catch(() => ({ docs: [] }))
      : Promise.resolve({ docs: [] }),
    adminDb()
      .collection("activity")
      .where("spaceId", "==", spaceId)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get()
      .catch(() => ({ docs: [] })),
  ]);

  const posts = postsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const gamification = {};
  gamificationSnap.docs.forEach((doc) => {
    gamification[doc.id] = doc.data();
  });

  const visit7 = visitKey(7);
  let activeThisWeek = 0;
  members.forEach((m) => {
    const g = gamification[m.userId];
    if (g && (g.lastVisitDate || "") >= visit7) activeThisWeek += 1;
  });

  const topContent = rankTopPosts(posts);
  const topMemberCounts = {};
  const authorNames = {};
  posts.forEach((post) => {
    if (post.authorId) topMemberCounts[post.authorId] = (topMemberCounts[post.authorId] || 0) + 1;
    if (post.authorId && post.authorName) authorNames[post.authorId] = post.authorName;
  });
  const topMembers = Object.entries(topMemberCounts)
    .map(([authorId, count]) => ({
      authorId,
      authorName: authorNames[authorId] || "Member",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentActivity = activitySnap.docs
    ? activitySnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          actorName: data.actorName || data.userName || "",
          text: data.text || data.action || "",
          createdAt: toMillis(data.createdAt),
        };
      })
    : [];

  return {
    posts: posts.length,
    members: members.length,
    activeMembers: activeThisWeek,
    topContent,
    topMembers,
    recentActivity,
  };
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(section, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(","));
  return `${section}\n${headers.map(csvEscape).join(",")}\n${lines.join("\n")}\n`;
}

export async function buildAnalyticsCsv() {
  const data = await getAnalytics();
  const revenue = await getRevenueAnalytics();

  const sections = [];
  sections.push("# Secret Yarnery Analytics Export");
  sections.push(`Generated: ${new Date().toISOString()}\n`);

  sections.push(
    rowsToCsv(
      "Member Summary",
      [
        {
          metric: "total_members",
          value: data.members.total,
        },
        {
          metric: "new_last_7_days",
          value: data.members.signups.last7,
        },
        {
          metric: "new_last_30_days",
          value: data.members.signups.last30,
        },
        {
          metric: "active_last_7_days",
          value: data.members.active7,
        },
        {
          metric: "contributing",
          value: data.members.contributing,
        },
      ]
    )
  );

  sections.push(
    rowsToCsv(
      "Engagement Metrics",
      [
        { metric: "posts", value: data.engagement.posts },
        { metric: "posts_last_7_days", value: data.engagement.posts7 },
        { metric: "comments", value: data.engagement.comments },
        { metric: "rsvps", value: data.engagement.rsvps },
        { metric: "rsvp_members", value: data.engagement.rsvpMembers },
      ]
    )
  );

  sections.push(
    rowsToCsv(
      "Revenue Summary",
      [
        {
          metric: "estimated_recurring_monthly_cents",
          value: data.revenue.subscriptions.estimatedMonthlyCents,
        },
        {
          metric: "one_time_revenue_cents",
          value: data.revenue.purchases.revenueCents,
        },
        {
          metric: "active_subscriptions",
          value: data.revenue.subscriptions.active,
        },
      ]
    )
  );

  sections.push(
    rowsToCsv(
      "Revenue by Month",
      revenue.map((r) => ({ ...r }))
    )
  );

  sections.push(
    rowsToCsv(
      "Top Content",
      data.topContent.map((p) => ({
        id: p.id,
        text: p.text,
        authorName: p.authorName,
        likes: p.likeCount,
        comments: p.commentCount,
        score: p.score,
      }))
    )
  );

  sections.push(
    rowsToCsv(
      "Top Members",
      data.topMembers.map((m) => ({
        rank: m.rank,
        name: m.name,
        points: m.points,
        badges: m.badgeCount,
      }))
    )
  );

  return sections.join("\n");
}
