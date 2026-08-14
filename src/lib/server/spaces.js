import { adminDb } from "@/lib/firebase/admin";
import {
  SPACE_FEATURES,
  SPACE_FEATURE_LABELS,
  SPACE_ACCESS,
  SPACE_ACCESS_LABELS,
  slugify,
  normalizeFeatures,
  normalizeAccess,
} from "@/lib/server/spaces-core";

export {
  SPACE_FEATURES,
  SPACE_FEATURE_LABELS,
  SPACE_ACCESS,
  SPACE_ACCESS_LABELS,
  slugify,
  normalizeFeatures,
  normalizeAccess,
};

export async function listSpaces() {
  const snap = await adminDb().collection("spaces").orderBy("createdAt", "desc").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((space) => space.status === "active");
}

export async function getSpaceBySlug(slug) {
  const snap = await adminDb().collection("spaces").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getSpace(id) {
  const doc = await adminDb().collection("spaces").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getSpaceMembers(spaceId) {
  const snap = await adminDb()
    .collection("spaceMembers")
    .where("spaceId", "==", spaceId)
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.joinedAt?.toMillis?.() || 0) - (b.joinedAt?.toMillis?.() || 0));
}

export async function isSpaceMember(spaceId, uid) {
  const doc = await adminDb().collection("spaceMembers").doc(`${spaceId}_${uid}`).get();
  return doc.exists ? doc.data() : null;
}

export async function addSpaceMember(spaceId, uid, name, role = "member") {
  const ref = adminDb().collection("spaceMembers").doc(`${spaceId}_${uid}`);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({
    spaceId,
    userId: uid,
    name,
    role,
    joinedAt: new Date(),
  });
  return true;
}

export async function removeSpaceMember(spaceId, uid) {
  await adminDb().collection("spaceMembers").doc(`${spaceId}_${uid}`).delete();
}

export async function createSpace({ name, description, features, access, requiredTier, createdBy }) {
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const ref = adminDb().collection("spaces").doc();
  await ref.set({
    name,
    slug,
    description: description || "",
    features: normalizeFeatures(features),
    access: normalizeAccess(access),
    requiredTier: requiredTier === "premium" ? "premium" : "",
    status: "active",
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id, slug, name, description };
}

export async function updateSpace(spaceId, { name, description, features, access, requiredTier }) {
  const ref = adminDb().collection("spaces").doc(spaceId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof description === "string") data.description = description;
  if (features) data.features = normalizeFeatures(features);
  if (access) data.access = normalizeAccess(access);
  data.requiredTier = requiredTier === "premium" ? "premium" : "";
  await ref.update(data);
  return { id: spaceId, ...doc.data(), ...data };
}

export async function deleteSpace(spaceId) {
  const members = await getSpaceMembers(spaceId);
  const batch = adminDb().batch();
  for (const member of members) {
    batch.delete(adminDb().collection("spaceMembers").doc(member.id));
  }
  batch.delete(adminDb().collection("spaces").doc(spaceId));
  await batch.commit();
}

export async function cascadeDeleteSpace(spaceId) {
  const { deleteWhere, deletePostWithComments } = await import("@/lib/server/delete");
  const { deleteRoom } = await import("@/lib/server/rooms");

  const roomsSnap = await adminDb().collection("rooms").where("spaceId", "==", spaceId).get();
  for (const doc of roomsSnap.docs) {
    await deleteRoom({ id: doc.id, ...doc.data() });
  }

  await deleteWhere("events", "spaceId", spaceId);

  const coursesSnap = await adminDb().collection("courses").where("spaceId", "==", spaceId).get();
  for (const doc of coursesSnap.docs) {
    await deleteWhere("lessons", "courseId", doc.id);
    await deleteWhere("modules", "courseId", doc.id);
    await doc.ref.delete();
  }

  const postsSnap = await adminDb().collection("posts").where("spaceId", "==", spaceId).get();
  for (const doc of postsSnap.docs) {
    await deletePostWithComments(doc.ref);
  }

  await deleteWhere("spaceMembers", "spaceId", spaceId);
  await adminDb().collection("spaces").doc(spaceId).delete();
}

export async function listRoomsForSpace(spaceId) {
  const snap = await adminDb().collection("rooms").where("spaceId", "==", spaceId).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function listEventsForSpace(spaceId) {
  const snap = await adminDb().collection("events").where("spaceId", "==", spaceId).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.startTime?.toMillis?.() || 0) - (b.startTime?.toMillis?.() || 0));
}

export async function listCoursesForSpace(spaceId) {
  const snap = await adminDb().collection("courses").where("spaceId", "==", spaceId).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}
