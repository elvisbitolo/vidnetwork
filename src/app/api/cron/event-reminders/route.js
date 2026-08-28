import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/server/email";
import { createNotification } from "@/lib/server/notifications";
import { logError } from "@/lib/server/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yarnerylounge.vercel.app";

  const snap = await adminDb()
    .collection("events")
    .where("startTime", ">=", now)
    .where("startTime", "<=", windowEnd)
    .get();

  let sent = 0;
  for (const doc of snap.docs) {
    const event = doc.data();
    const start = new Date(event.startTime.toMillis ? event.startTime.toMillis() : event.startTime);
    const hoursUntil = (start.getTime() - now.getTime()) / (60 * 60 * 1000);
    const joinHref = event.roomSlug ? `/rooms/${event.roomSlug}` : `/events`;

    const rsvpSnap = await adminDb().collection("rsvps").where("eventId", "==", doc.id).get();
    for (const rsvpDoc of rsvpSnap.docs) {
      const rsvp = rsvpDoc.data();
      if (rsvp.reminded === true) continue;
      const userSnap = await adminDb().collection("users").doc(rsvp.userId).get();
      const email = userSnap.exists ? userSnap.data().email : "";
      try {
        if (email) {
          await sendEmail({
            to: email,
            subject: `Reminder: "${event.title}" starts soon`,
            text:
              `You're going to "${event.title}" — it starts in ${Math.round(hoursUntil)} hour(s) at ` +
              `${start.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` +
              `\n\nJoin the room: ${baseUrl}${joinHref}`,
          });
        }
        await createNotification({
          userId: rsvp.userId,
          type: "event_reminder",
          actorId: "",
          actorName: "VidNetwork",
          text: `"${event.title}" starts soon — don't miss it.`,
          href: joinHref,
        });
        await rsvpDoc.ref.update({ reminded: true });
        sent++;
      } catch (err) {
        logError("email.event_reminder_failed", { eventId: doc.id, userId: rsvp.userId, error: err.message });
      }
    }
  }

  return NextResponse.json({ sent });
}
