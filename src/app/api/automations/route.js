import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/server/email";

const BATCH_SIZE = 50;
const INACTIVE_DAYS = 7;
const WELCOME_SENT_KEY = "welcomeSent";

function daysSince(date) {
  if (!date) return Infinity;
  const d = date?.toDate ? date.toDate() : new Date(date);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function sendWelcomeMessages(usersSnap) {
  let sent = 0;
  for (const doc of usersSnap.docs) {
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

async function sendInactivityNudges(usersSnap) {
  let sent = 0;
  for (const doc of usersSnap.docs) {
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

async function awardAutoBadges(usersSnap) {
  let awarded = 0;
  for (const doc of usersSnap.docs) {
    const gamiSnap = await adminDb().collection("gamification").doc(doc.id).get();
    const gami = gamiSnap.exists ? gamiSnap.data() : {};
    const points = gami.points || 0;
    const existing = gami.badges || [];
    const newBadges = [...existing];

    const milestones = [
      { at: 10, badge: "first-steps", label: "First Steps" },
      { at: 50, badge: "regular", label: "Regular" },
      { at: 100, badge: "powerhouse", label: "Powerhouse" },
      { at: 500, badge: "legend", label: "Community Legend" },
    ];

    for (const m of milestones) {
      if (points >= m.at && !existing.includes(m.badge)) {
        newBadges.push(m.badge);
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

    if (newBadges.length > existing.length) {
      await adminDb().collection("gamification").doc(doc.id).set(
        { badges: newBadges },
        { merge: true }
      );
      awarded++;
    }
  }
  return awarded;
}

export async function POST(req) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {};

  const usersSnap = await adminDb().collection("users").limit(BATCH_SIZE).get();
  results.totalUsers = usersSnap.size;

  results.welcomeSent = await sendWelcomeMessages(usersSnap);
  results.nudgesSent = await sendInactivityNudges(usersSnap);
  results.badgesAwarded = await awardAutoBadges(usersSnap);

  return NextResponse.json({ ok: true, ...results, timestamp: new Date().toISOString() });
}
