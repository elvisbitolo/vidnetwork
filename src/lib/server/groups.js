import { adminDb } from "@/lib/firebase/admin";

export async function listGroups() {
  const snap = await adminDb().collection("groups").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getGroup(id) {
  const doc = await adminDb().collection("groups").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getGroupBySlug(slug) {
  const snap = await adminDb().collection("groups").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getGroupMembers(groupId) {
  const snap = await adminDb()
    .collection("groupMembers")
    .where("groupId", "==", groupId)
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort(
      (a, b) =>
        (a.joinedAt?.toMillis?.() || 0) - (b.joinedAt?.toMillis?.() || 0)
    );
}

export async function isGroupMember(groupId, uid) {
  const doc = await adminDb().collection("groupMembers").doc(`${groupId}_${uid}`).get();
  return doc.exists ? doc.data() : null;
}
