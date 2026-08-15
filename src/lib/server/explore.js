import { adminDb } from "@/lib/firebase/admin";
import { listEvents, expandEvents } from "@/lib/server/events";

function toMillis(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  return new Date(value).getTime();
}

export async function getExploreData(limit = 6) {
  const [roomsSnap, eventsSnap, coursesSnap, spacesSnap] = await Promise.all([
    adminDb().collection("rooms").orderBy("createdAt", "desc").get(),
    adminDb().collection("events").orderBy("startTime", "asc").get(),
    adminDb().collection("courses").orderBy("createdAt", "desc").get(),
    adminDb().collection("spaces").orderBy("createdAt", "desc").get(),
  ]);

  const rooms = roomsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((room) => room.publicPreview && room.status === "active")
    .slice(0, limit)
    .map((room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description || "",
      kind: room.kind || "standard",
    }));

  const now = Date.now();
  const upcoming = eventsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((event) => event.publicPreview);
  const events = expandEvents(upcoming)
    .filter((event) => toMillis(event.startTime) > now)
    .sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description || "",
      startTime: toMillis(event.startTime),
    }));

  const courses = coursesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((course) => course.publicPreview && course.status === "published")
    .slice(0, limit)
    .map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description || "",
      purchasePriceCents: Number(course.purchasePriceCents) || 0,
    }));

  const spaces = spacesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((space) => space.publicPreview && space.status === "active" && space.access !== "invite-only")
    .slice(0, limit)
    .map((space) => ({
      id: space.id,
      slug: space.slug,
      name: space.name,
      description: space.description || "",
    }));

  return { rooms, events, courses, spaces };
}
