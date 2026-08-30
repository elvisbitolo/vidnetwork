import { NextResponse } from "next/server";
import { logError } from "@/lib/server/log";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/server/email";
import { awardPoints, POINTS } from "@/lib/server/gamification";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { applyRsvpCounts } from "@/lib/server/events-core";
import { runAutomations } from "@/lib/server/automations";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const limited = rateLimitGuard(`rsvp:${user.uid}`, { limit: 10 });
  if (limited) return limited;

  const { eventId, occurrenceId = "" } = await req.json();
  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "Event required" }, { status: 400 });
  }

  const eventRef = adminDb().collection("events").doc(eventId);
  const userDoc = await getUserDoc(user.uid);
  const memberName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";

  if (userDoc?.role !== "owner") {
    const eventSnap = await eventRef.get();
    const eventData = eventSnap.data();
    if (!eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
  }

  const rsvpKey = occurrenceId || eventId;
  const ref = adminDb().collection("rsvps").doc(`${rsvpKey}_${user.uid}`);
  const countKey = occurrenceId || "_";

  let joined;
  try {
    joined = await adminDb().runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) {
        throw Object.assign(new Error("Event not found"), { code: 404 });
      }
      const event = eventSnap.data();

      const existing = await tx.get(ref);
      if (existing.exists) {
        const { counts } = applyRsvpCounts(event.capacityCounts, countKey, event.capacity, false);
        if (JSON.stringify(counts) !== JSON.stringify(event.capacityCounts || {})) {
          tx.update(eventRef, { capacityCounts: counts });
        }
        tx.delete(ref);
        return false;
      }

      const capacity = Number(event.capacity) || 0;
      const { full, counts } = applyRsvpCounts(
        event.capacityCounts,
        countKey,
        capacity,
        true
      );
      if (full) {
        throw Object.assign(new Error("This event is full"), { code: 409 });
      }

      tx.create(ref, {
        eventId,
        occurrenceId,
        userId: user.uid,
        name: memberName,
        createdAt: new Date(),
      });
      if (capacity > 0) {
        tx.update(eventRef, { capacityCounts: counts });
      }
      return true;
    });
  } catch (err) {
    const status = err.code || 500;
    if (status === 409) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err.message || "RSVP failed" },
      { status }
    );
  }

  if (!joined) {
    return NextResponse.json({ joined: false });
  }

  const eventSnap = await eventRef.get();
  const event = eventSnap.data();

  await awardPoints(user.uid, POINTS.RSVP, memberName).catch((err) => {
    logError("gamification.rsvp_failed", { uid: user.uid, eventId, error: err.message });
  });

  runAutomations("event_rsvp", {
    rsvpName: memberName,
    rsvpUid: user.uid,
    eventTitle: event?.title || "",
    eventId,
    subjectUid: user.uid,
    subjectName: memberName,
  }).catch((err) => {
    logError("automation.event_rsvp_failed", { eventId, uid: user.uid, error: err.message });
  });

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
        }).catch((err) => {
          logError("email.rsvp_notify_failed", { eventId, to: creator.email, error: err.message });
        });
      }
    }
  }

  return NextResponse.json({ joined: true });
}
