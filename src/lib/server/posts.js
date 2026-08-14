import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getSpace, isSpaceMember } from "@/lib/server/spaces";
import { postAccessCheck, nextLikeState } from "@/lib/server/posts-core";

export { postAccessCheck, nextLikeState };

export async function canAccessPost(postId, uid, userDoc) {
  const snap = await adminDb().collection("posts").doc(postId).get();
  if (!snap.exists) return { ok: false, status: 404, error: "Post not found" };
  const post = snap.data();

  if (userDoc?.role === "owner" || post.authorId === uid) {
    return { ok: true, post };
  }

  const sub = await getSubscription(uid);
  if (!isActiveSub(sub)) {
    return { ok: false, status: 403, error: "Active membership required" };
  }

  if (post.spaceId) {
    const space = await getSpace(post.spaceId);
    if (!space || space.status !== "active") {
      return { ok: false, status: 404, error: "Post not found" };
    }
    if (!(await isSpaceMember(post.spaceId, uid))) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }

  if (post.groupId) {
    const memberSnap = await adminDb()
      .collection("groupMembers")
      .doc(`${post.groupId}_${uid}`)
      .get();
    if (!memberSnap.exists) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }

  return { ok: true, post };
}
