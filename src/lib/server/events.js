import { adminDb } from "@/lib/firebase/admin";

export async function listEvents() {
  const snap = await adminDb().collection("events").orderBy("startTime", "asc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getEvent(id) {
  const doc = await adminDb().collection("events").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

function addInterval(date, freq, interval) {
  const d = new Date(date);
  if (freq === "daily") d.setDate(d.getDate() + interval);
  else if (freq === "weekly") d.setDate(d.getDate() + 7 * interval);
  else if (freq === "monthly") d.setMonth(d.getMonth() + interval);
  return d;
}

export function expandEvent(event, until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) {
  const recurrence = event.recurrence;
  if (!recurrence || !recurrence.freq || recurrence.count <= 1) {
    return [{ ...event, occurrenceId: `${event.id}_0`, occurrenceIndex: 0 }];
  }

  const count = Math.min(Number(recurrence.count) || 1, 52);
  const interval = Math.max(Number(recurrence.interval) || 1, 1);
  const occurrences = [];
  const base = new Date(event.startTime.toMillis ? event.startTime.toMillis() : event.startTime);
  let cursor = new Date(base);
  for (let i = 0; i < count; i++) {
    if (cursor.getTime() > until.getTime()) break;
    occurrences.push({
      ...event,
      startTime: new Date(cursor),
      occurrenceId: `${event.id}_${i}`,
      occurrenceIndex: i,
    });
    cursor = addInterval(cursor, recurrence.freq, interval);
  }
  return occurrences;
}

export function expandEvents(events) {
  const expanded = [];
  for (const event of events) {
    expanded.push(...expandEvent(event));
  }
  return expanded.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export async function createEvent({ title, description, startTime, endTime, roomSlug, capacity, recurrence, createdBy }) {
  const ref = adminDb().collection("events").doc();
  const data = {
    title,
    description: description || "",
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : null,
    roomSlug: roomSlug || "",
    capacity: Number(capacity) || 0,
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
