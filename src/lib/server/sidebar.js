import { adminDb } from "@/lib/firebase/admin";
import { getGamification } from "@/lib/server/gamification";
import { listLiveMemberUids } from "@/lib/server/livekit";
import { startOfDay, visitKey } from "@/lib/server/analytics-core";
import { STREAK_TARGETS, getNextMilestone } from "@/lib/server/sidebar-core";

const CONTRIBUTOR_LIMIT = 8;
const RECOMMEND_LIMIT = 4;

function windowDays(period) {
  if (period === "week") return 7;
  if (period === "month") return 30;
  return 1;
}

async function safeLimit(collectionName, where, max = 3000) {
  const snap = await adminDb()
    .collection(collectionName)
    .where(...where)
    .limit(max)
    .get();
  return snap.docs;
}

async function fetchAllDocIds(refs) {
  const out = [];
  const chunk = 30;
  for (let i = 0; i < refs.length; i += chunk) {
    const batch = await adminDb().getAll(...refs.slice(i, i + chunk));
    out.push(...batch.filter((s) => s.exists));
  }
  return out;
}

async function loadContributors(uid, period) {
  const since = startOfDay(windowDays(period));
  const sinceDate = new Date(since);

  const [postsSnap, commentsSnap, gamiSnap] = await Promise.all([
    safeLimit(
      "posts",
      ["createdAt", ">=", sinceDate],
      500
    ),
    adminDb()
      .collectionGroup("comments")
      .where("createdAt", ">=", sinceDate)
      .limit(1000)
      .get(),
    adminDb()
      .collection("gamification")
      .where("lastVisitDate", ">=", visitKey(Math.max(0, windowDays(period) - 1)))
      .limit(400)
      .get(),
  ]);

  const activeIds = new Set();
  postsSnap.forEach((doc) => {
    const authorId = doc.data().authorId;
    if (authorId) activeIds.add(authorId);
  });
  commentsSnap.forEach((doc) => {
    const authorId = doc.data().authorId;
    if (authorId) activeIds.add(authorId);
  });
  gamiSnap.docs.forEach((doc) => activeIds.add(doc.id));

  const idList = [...activeIds].filter((id) => id && id !== uid).slice(0, 60);
  if (idList.length === 0) return [];

  const gamiDocs = await fetchAllDocIds(
    idList.map((id) => adminDb().collection("gamification").doc(id))
  );

  const scored = gamiDocs
    .map((doc) => ({
      id: doc.id,
      points: Number(doc.data().points) || 0,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, CONTRIBUTOR_LIMIT);

  const userDocs = await fetchAllDocIds(
    scored.map((entry) => adminDb().collection("users").doc(entry.id))
  );
  const byId = new Map(userDocs.map((doc) => [doc.id, doc.data()]));

  return scored.map((entry, index) => {
    const user = byId.get(entry.id) || {};
    return {
      id: entry.id,
      name: user.name || "Member",
      username: user.username || "",
      photoURL: user.photoURL || "",
      points: entry.points,
      rank: index + 1,
    };
  });
}

async function loadRecommended(uid, contributors) {
  const picks = contributors.filter((c) => c.id !== uid).slice(0, RECOMMEND_LIMIT);
  if (picks.length >= RECOMMEND_LIMIT) return picks;

  const existing = new Set([uid, ...picks.map((c) => c.id)]);
  const gamiSnap = await adminDb()
    .collection("gamification")
    .orderBy("points", "desc")
    .limit(30)
    .get();
  const extra = gamiSnap.docs
    .map((doc) => doc.id)
    .filter((id) => !existing.has(id))
    .slice(0, RECOMMEND_LIMIT - picks.length);

  const userDocs = await fetchAllDocIds(
    extra.map((id) => adminDb().collection("users").doc(id))
  );
  const gamiById = new Map(gamiSnap.docs.map((doc) => [doc.id, doc.data()]));

  userDocs.forEach((doc) => {
    const user = doc.data();
    if (!user.name) return;
    picks.push({
      id: doc.id,
      name: user.name,
      username: user.username || "",
      photoURL: user.photoURL || "",
      points: Number(gamiById.get(doc.id)?.points) || 0,
      rank: 0,
    });
  });
  return picks.slice(0, RECOMMEND_LIMIT);
}

export async function getSidebarData(uid, period = "day") {
  const gami = await getGamification(uid);
  const streak = Number(gami.streak) || 0;

  const since = startOfDay(1);
  const sinceDate = new Date(since);

  const [onlineUids, usersTodaySnap, postsTodaySnap, commentsTodaySnap] =
    await Promise.all([
      listLiveMemberUids().catch(() => new Set()),
      safeLimit("users", ["createdAt", ">=", sinceDate], 3000),
      safeLimit("posts", ["createdAt", ">=", sinceDate], 3000),
      adminDb()
        .collectionGroup("comments")
        .where("createdAt", ">=", sinceDate)
        .limit(3000)
        .get(),
    ]);

  const milestone = getNextMilestone(streak);

  const contributors = await loadContributors(uid, period);
  const recommended = await loadRecommended(uid, contributors);

  return {
    streak,
    bestStreak: Number(gami.bestStreak) || 0,
    points: Number(gami.points) || 0,
    nextMilestone: milestone,
    activity: {
      onlineNow: onlineUids.size,
      newToday: usersTodaySnap.length,
      postsToday: postsTodaySnap.length,
      commentsToday: commentsTodaySnap.size,
    },
    contributors,
    recommended,
  };
}