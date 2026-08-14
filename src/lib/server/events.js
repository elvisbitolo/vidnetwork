import { adminDb } from "@/lib/firebase/admin";
import { addInterval, expandEvent, expandEvents } from "@/lib/server/events-core";

export { expandEvent, expandEvents, addInterval };

export async function listEvents() {
  const snap = await adminDb().collection("events").orderBy("startTime", "asc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getEvent(id) {
  const doc = await adminDb().collection("events").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function createEvent({ title, description, startTime, endTime, roomSlug, capacity, recurrence, spaceId, createdBy }) {
  const ref = adminDb().collection("events").doc();
  const data = {
    title,
    description: description || "",
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : null,
    roomSlug: roomSlug || "",
    capacity: Number(capacity) || 0,
    spaceId: spaceId || "",
    createdBy,
    createdAt: new Date(),
  };
  if (recurrence && recurrence.freq && Number(recurrence.count) > 1) {
    data.recurrence = {
      freq: ["daily", "weekly", "monthly"].includes(recurrence.freq) ? recurrence.freq : "weekly",
      interval: Math.max(Number(recurrence.interval) || 1, 1),
      count: Math.min(Number(recurrence.count) || 2, 52),
    };
  }
  await ref.set(data);
  return { id: ref.id, title, startTime };
}

export async function listRsvps(eventId) {
  const snap = await adminDb().collection("rsvps").where("eventId", "==", eventId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
