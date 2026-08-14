import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/server/email";
import { awardPoints, POINTS } from "@/lib/server/gamification";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { eventId, occurrenceId = "" } = await req.json();
  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "Event required" }, { status: 400 });
  }

  const eventSnap = await adminDb().collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const event = eventSnap.data();

  const userDoc = await getUserDoc(user.uid);
  const memberName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";

  const rsvpKey = occurrenceId || eventId;
  const ref = adminDb().collection("rsvps").doc(`${rsvpKey}_${user.uid}`);
  const mine = (await ref.get()).exists;

  if (mine) {
    await ref.delete();
    return NextResponse.json({ joined: false });
  }

  const capacity = Number(event.capacity) || 0;
  if (capacity > 0) {
    const base = adminDb().collection("rsvps").where("eventId", "==", eventId);
    const countSnap = occurrenceId
      ? await base.where("occurrenceId", "==", occurrenceId).get()
      : await base.get();
    if (countSnap.size >= capacity) {
      return NextResponse.json({ error: "This event is full" }, { status: 409 });
    }
  }

  await ref.set({
    eventId,
    occurrenceId,
    userId: user.uid,
    name: memberName,
    email: user.email || "",
    createdAt: new Date(),
  });

  await awardPoints(user.uid, POINTS.RSVP, memberName);

  if (event.createdBy && event.createdBy !== user.uid) {
    await createNotification({
      userId: event.createdBy,
      type: "rsvp",
      actorId: user.uid,
      actorName: memberName,
      targetId: eventId,
      href: `/events`,
      text: `RSVP'd to "${event.title}"`,
    });

    const creatorDoc = await adminDb().collection("users").doc(event.createdBy).get();
    if (creatorDoc.exists) {
      const creator = creatorDoc.data();
      if (creator.email && creator.notifications !== "off") {
        await sendEmail({
          to: creator.email,
          subject: `New RSVP for "${event.title}"`,
          text: `${memberName} is going to "${event.title}".\n\nView RSVPs on the events page.`,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ joined: true });
}
