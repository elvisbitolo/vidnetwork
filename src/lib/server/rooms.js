import { adminDb } from "@/lib/firebase/admin";
import { deleteDocs } from "@/lib/server/delete";

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function listRooms() {
  const snap = await adminDb().collection("rooms").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listRoomsForGroup(groupId) {
  const snap = await adminDb()
    .collection("rooms")
    .where("groupId", "==", groupId)
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function getRoomBySlug(slug) {
  const snap = await adminDb().collection("rooms").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function createRoom({ name, description, maxParticipants, groupId, spaceId, kind, publicPreview, createdBy }) {
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const ref = adminDb().collection("rooms").doc();
  await ref.set({
    name,
    slug,
    description: description || "",
    status: "active",
    maxParticipants,
    groupId: groupId || "",
    spaceId: spaceId || "",
    kind: kind === "broadcast" ? "broadcast" : "standard",
    publicPreview: !!publicPreview,
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id, slug, name, description };
}

async function endLiveKitRoom(slug) {
  const host = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!host || !key || !secret || !slug) return;
  try {
    const { RoomServiceClient } = await import("livekit-server-sdk");
    const url = new URL(host);
    const client = new RoomServiceClient(`${url.protocol}//${url.host}`, key, secret);
    const rooms = await client.listRooms();
    if (rooms.some((r) => r.name === slug)) {
      await client.deleteRoom(slug);
    }
  } catch {
    // Room teardown is best-effort; the Firestore record is still removed.
  }
}

export async function deleteRoom(room) {
  await endLiveKitRoom(room.slug);
  const eventsSnap = await adminDb()
    .collection("roomEvents")
    .where("roomId", "==", room.id)
    .get();
  await deleteDocs(eventsSnap.docs);
  await adminDb().collection("rooms").doc(room.id).delete();
}
