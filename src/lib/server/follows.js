import { adminDb } from "@/lib/firebase/admin";

export async function followUser(followerId, followingId) {
  if (followerId === followingId) return { ok: false, error: "Cannot follow yourself" };
  const docId = `${followerId}_${followingId}`;
  const ref = adminDb().collection("follows").doc(docId);
  const snap = await ref.get();
  if (snap.exists) return { ok: false, error: "Already following" };
  await ref.set({
    followerId,
    followingId,
    createdAt: new Date(),
  });
  return { ok: true };
}

export async function unfollowUser(followerId, followingId) {
  const docId = `${followerId}_${followingId}`;
  await adminDb().collection("follows").doc(docId).delete();
  return { ok: true };
}

export async function isFollowing(followerId, followingId) {
  const docId = `${followerId}_${followingId}`;
  const doc = await adminDb().collection("follows").doc(docId).get();
  return doc.exists;
}

export async function getFollowers(userId) {
  const snap = await adminDb()
    .collection("follows")
    .where("followingId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getFollowing(userId) {
  const snap = await adminDb()
    .collection("follows")
    .where("followerId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getFollowerCount(userId) {
  const snap = await adminDb()
    .collection("follows")
    .where("followingId", "==", userId)
    .get();
  return snap.size;
}

export async function getFollowingCount(userId) {
  const snap = await adminDb()
    .collection("follows")
    .where("followerId", "==", userId)
    .get();
  return snap.size;
}
