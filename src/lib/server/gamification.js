import { adminDb } from "@/lib/firebase/admin";

export const POINTS = {
  POST: 10,
  COMMENT: 5,
  LESSON: 15,
  RSVP: 5,
  DAILY_VISIT: 10,
  BADGE_BONUS: 20,
};

export const BADGES = {
  welcome: { name: "Welcome", description: "Joined the community" },
  first_post: { name: "First Post", description: "Published your first post" },
  ten_posts: { name: "10 Posts", description: "Published 10 posts" },
  fifty_posts: { name: "50 Posts", description: "Published 50 posts" },
  first_comment: { name: "First Comment", description: "Commented on a post" },
  streak_3: { name: "3 Day Streak", description: "Visited 3 days in a row" },
  streak_7: { name: "7 Day Streak", description: "Visited 7 days in a row" },
  streak_30: { name: "30 Day Streak", description: "Visited 30 days in a row" },
  course_complete: { name: "Course Completed", description: "Finished a course" },
};

function todayKey(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function docRef(uid) {
  return adminDb().collection("gamification").doc(uid);
}

async function ensureDoc(uid, name) {
  const ref = docRef(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    try {
      await ref.set({
        points: 0,
        streak: 0,
        bestStreak: 0,
        badges: {},
        lastVisitDate: "",
        name: name || "Member",
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: false });
    } catch (err) {
      if (err.code !== 6 && !err.message?.includes("ALREADY_EXISTS")) throw err;
    }
  }
  return ref;
}

export async function getGamification(uid, name) {
  const ref = await ensureDoc(uid, name);
  const snap = await ref.get();
  const data = snap.data() || {};
  return {
    points: data.points || 0,
    streak: data.streak || 0,
    bestStreak: data.bestStreak || 0,
    badges: data.badges || {},
    name: data.name || "Member",
  };
}

export async function awardPoints(uid, amount, name) {
  await adminDb().runTransaction(async (tx) => {
    const ref = docRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        points: amount,
        streak: 0,
        bestStreak: 0,
        badges: {},
        lastVisitDate: "",
        name: name || "Member",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return;
    }
    tx.update(ref, {
      points: Math.max(0, (snap.data().points || 0) + amount),
      updatedAt: new Date(),
    });
  });
}

export async function awardBadge(uid, code, name) {
  const meta = BADGES[code];
  if (!meta) return;
  await adminDb().runTransaction(async (tx) => {
    const ref = docRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        points: POINTS.BADGE_BONUS,
        streak: 0,
        bestStreak: 0,
        badges: { [code]: { name: meta.name, earnedAt: new Date() } },
        lastVisitDate: "",
        name: name || "Member",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return;
    }
    const data = snap.data();
    const badges = data.badges || {};
    if (badges[code]) return;
    badges[code] = { name: meta.name, earnedAt: new Date() };
    tx.update(ref, {
      badges,
      points: (data.points || 0) + POINTS.BADGE_BONUS,
      updatedAt: new Date(),
    });
  });
}

export async function recordDailyVisit(uid, name) {
  await adminDb().runTransaction(async (tx) => {
    const ref = docRef(uid);
    const snap = await tx.get(ref);
    const now = todayKey();
    if (!snap.exists) {
      tx.set(ref, {
        points: POINTS.DAILY_VISIT,
        streak: 1,
        bestStreak: 1,
        badges: {},
        lastVisitDate: now,
        name: name || "Member",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return;
    }
    const data = snap.data();
    if (data.lastVisitDate === now) return;

    let streak = data.streak || 0;
    if (data.lastVisitDate === todayKey(1)) {
      streak += 1;
    } else {
      streak = 1;
    }
    const bestStreak = Math.max(data.bestStreak || 0, streak);
    const badges = data.badges || {};
    const newBadges = {};
    if (streak >= 3 && !badges.streak_3) newBadges.streak_3 = { name: BADGES.streak_3.name, earnedAt: new Date() };
    if (streak >= 7 && !badges.streak_7) newBadges.streak_7 = { name: BADGES.streak_7.name, earnedAt: new Date() };
    if (streak >= 30 && !badges.streak_30) newBadges.streak_30 = { name: BADGES.streak_30.name, earnedAt: new Date() };

    tx.update(ref, {
      streak,
      bestStreak,
      lastVisitDate: now,
      points: (data.points || 0) + POINTS.DAILY_VISIT + Object.keys(newBadges).length * POINTS.BADGE_BONUS,
      badges: { ...badges, ...newBadges },
      name: name || data.name || "Member",
      updatedAt: new Date(),
    });
  });
}

export async function getLeaderboard(limit = 20) {
  const snap = await adminDb()
    .collection("gamification")
    .orderBy("points", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d, index) => {
    const data = d.data();
    return {
      userId: d.id,
      name: data.name || "Member",
      points: data.points || 0,
      streak: data.streak || 0,
      badgeCount: Object.keys(data.badges || {}).length,
      rank: index + 1,
    };
  });
}
