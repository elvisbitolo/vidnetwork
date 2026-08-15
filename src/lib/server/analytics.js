import { adminDb } from "@/lib/firebase/admin";
import { getLeaderboard } from "@/lib/server/gamification";
import { getStripe } from "@/lib/server/stripe";
import { getCourse } from "@/lib/server/courses";
import { getEvent } from "@/lib/server/events";
import { getSpace } from "@/lib/server/spaces";
import { isActiveSub } from "@/lib/server/billing";
import {
  startOfDay,
  visitKey,
  toMillis,
  monthlyRateCents,
  summarizeSubscriptions,
  summarizePurchases,
  rankTopPosts,
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

const TYPE_LABEL = { course: "Course", event: "Event", space: "Space" };

function offerKey(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

export async function getIncomeData() {
  const now = Date.now();
  const [
    subscriptionsSnap,
    purchasesSnap,
    promosSnap,
    usersSnap,
  ] = await Promise.all([
    adminDb().collection("subscriptions").get(),
    adminDb().collection("purchases").get(),
    adminDb().collection("promoCodes").get(),
    adminDb().collection("users").get(),
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

  const subs = subscriptionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const summary = summarizeSubscriptions(subs, priceMap, now);

  const tierBreakdown = {};
  for (const sub of subs) {
    if (!isActiveSub(sub, now)) continue;
    const tier = sub.tier || "standard";
    const mrr = monthlyRateCents(priceMap[sub.priceId]);
    tierBreakdown[tier] = tierBreakdown[tier] || { count: 0, mrrCents: 0 };
    tierBreakdown[tier].count += 1;
    tierBreakdown[tier].mrrCents += mrr;
  }

  const usersById = {};
  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    usersById[doc.id] = data.name || data.displayName || data.email || doc.id;
  });

  const offers = {};
  const recent = [];
  const withPrice = await Promise.all(
    purchasesSnap.docs.map(async (doc) => {
      const data = doc.data();
      const loader =
        data.targetType === "course"
          ? getCourse
          : data.targetType === "event"
            ? getEvent
            : getSpace;
      let item = null;
      try {
        item = await loader(data.targetId);
      } catch {
        item = null;
      }
      const priceCents = Number(item?.purchasePriceCents) || 0;
      const key = offerKey(data.targetType, data.targetId);
      offers[key] = offers[key] || {
        targetType: data.targetType,
        targetId: data.targetId,
        title: item?.title || item?.name || (data.targetType === "course" ? "Course" : data.targetType === "event" ? "Event" : "Space"),
        count: 0,
        revenueCents: 0,
      };
      offers[key].count += 1;
      offers[key].revenueCents += priceCents;
      return {
        targetType: data.targetType,
        targetId: data.targetId,
        title: offers[key].title,
        priceCents,
        purchasedAt: toMillis(data.purchasedAt),
        memberName: usersById[data.uid] || "Member",
        promoCode: data.promoCode || "",
      };
    })
  );

  const offersList = Object.values(offers).sort((a, b) => b.revenueCents - a.revenueCents);
  const oneTimeRevenueCents = withPrice.reduce((sum, p) => sum + p.priceCents, 0);
  const promoRevenueShare = withPrice
    .filter((p) => p.promoCode)
    .reduce((sum, p) => sum + p.priceCents, 0);

  recent.push(
    ...withPrice
      .filter((p) => p.purchasedAt > 0)
      .sort((a, b) => b.purchasedAt - a.purchasedAt)
      .slice(0, 10)
  );

  const promos = promosSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      code: data.code,
      uses: Number(data.uses) || 0,
      maxUses: Number(data.maxUses) || 0,
      percentOff: Number(data.percentOff) || 0,
      amountOffCents: Number(data.amountOffCents) || 0,
      active: data.active !== false,
    };
  });

  return {
    recurring: {
      mrrCents: summary.estimatedMonthlyCents,
      activeSubscribers: summary.active,
      cancelAtPeriodEnd: summary.cancelAtPeriodEnd,
      tierBreakdown: Object.entries(tierBreakdown).map(([tier, value]) => ({
        tier,
        count: value.count,
        mrrCents: value.mrrCents,
      })),
    },
    oneTime: {
      revenueCents: oneTimeRevenueCents,
      promoRevenueCents: promoRevenueShare,
      offers: offersList,
      recent,
    },
    promos,
    labelForType: TYPE_LABEL,
  };
}
