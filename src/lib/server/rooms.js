import { adminDb } from "@/lib/firebase/admin";

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

export async function createRoom({ name, description, maxParticipants, groupId, spaceId, kind, createdBy }) {
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
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id, slug, name, description };
}
