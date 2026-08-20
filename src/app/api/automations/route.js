import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/server/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INACTIVE_DAYS = 7;
const WELCOME_SENT_KEY = "welcomeSent";
const PAGE_SIZE = 500;

async function* paginateUsers() {
  let lastDoc = null;
  while (true) {
    let query = adminDb().collection("users").orderBy("__name__").limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    yield* snap.docs;
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < PAGE_SIZE) break;
  }
}

function daysSince(date) {
  if (!date) return Infinity;
  const d = date?.toDate ? date.toDate() : new Date(date);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function sendWelcomeMessages() {
  let sent = 0;
  for await (const doc of paginateUsers()) {
    const data = doc.data();
    if (data[WELCOME_SENT_KEY]) continue;

    try {
      await createNotification({
        userId: doc.id,
        type: "system",
        actorId: "system",
        actorName: "VidNetwork",
        href: "/dashboard",
        text: "Welcome to the community! Start by introducing yourself in the Feed or exploring the Members directory.",
      });

      if (data.email) {
        await sendEmail({
          to: data.email,
          subject: "Welcome to VidNetwork!",
          text: `Hi ${data.name || "there"},\n\nWelcome to the community! We're glad you're here.\n\nStart by introducing yourself in the Feed or exploring the Members directory.\n\nSee you inside!\n— VidNetwork`,
        }).catch(() => {});
      }

      await doc.ref.update({ [WELCOME_SENT_KEY]: true, welcomeSentAt: new Date() });
      sent++;
    } catch (err) {
      console.error("automation.welcome_failed", doc.id, err.message);
    }
  }
  return sent;
}

async function sendInactivityNudges() {
  let sent = 0;
  for await (const doc of paginateUsers()) {
    const data = doc.data();
    const lastVisit = data.lastVisitDate;
    const createdAt = data.createdAt;

    if (!lastVisit && daysSince(createdAt) < INACTIVE_DAYS) continue;
    if (lastVisit && daysSince(new Date(lastVisit)) < INACTIVE_DAYS) continue;
    if (data.notifications === "off") continue;

    const lastNudge = data.lastNudgeAt;
    if (lastNudge && daysSince(lastNudge) < INACTIVE_DAYS) continue;

    try {
      await createNotification({
        userId: doc.id,
        type: "system",
        actorId: "system",
        actorName: "VidNetwork",
        href: "/feed",
        text: "We miss you! Check out what's new in the community.",
      });

      await doc.ref.update({ lastNudgeAt: new Date() });
      sent++;
    } catch (err) {
      console.error("automation.nudge_failed", doc.id, err.message);
    }
  }
  return sent;
}

async function awardAutoBadges() {
  let awarded = 0;
  for await (const doc of paginateUsers()) {
    const gamiSnap = await adminDb().collection("gamification").doc(doc.id).get();
    const gami = gamiSnap.exists ? gamiSnap.data() : {};
    const points = gami.points || 0;
    const existing = gami.badges || {};
    let changed = false;

    const milestones = [
      { at: 10, badge: "first-steps", label: "First Steps" },
      { at: 50, badge: "regular", label: "Regular" },
      { at: 100, badge: "powerhouse", label: "Powerhouse" },
      { at: 500, badge: "legend", label: "Community Legend" },
    ];

    for (const m of milestones) {
      if (points >= m.at && !existing[m.badge]) {
        existing[m.badge] = { name: m.label, earnedAt: new Date() };
        changed = true;
        await createNotification({
          userId: doc.id,
          type: "system",
          actorId: "system",
          actorName: "VidNetwork",
          href: "/leaderboard",
          text: `You earned the "${m.label}" badge for reaching ${m.at} points!`,
        }).catch(() => {});
      }
    }

    if (changed) {
      await adminDb().collection("gamification").doc(doc.id).set(
        { badges: existing },
        { merge: true }
      );
      awarded++;
    }
  }
  return awarded;
}

export async function POST(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {};

  results.welcomeSent = await sendWelcomeMessages();
  results.nudgesSent = await sendInactivityNudges();
  results.badgesAwarded = await awardAutoBadges();

  return NextResponse.json({ ok: true, ...results, timestamp: new Date().toISOString() });
}
