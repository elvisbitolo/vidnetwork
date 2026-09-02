import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function DELETE(req, { params }) {
  const { id: postId, commentId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const limited = rateLimitGuard(`comment-delete:${user.uid}`, { limit: 60 });
  if (limited) return limited;

  const commentRef = adminDb()
    .collection("posts")
    .doc(postId)
    .collection("comments")
    .doc(commentId);
  const snap = await commentRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  const comment = snap.data();

  const userDoc = await getUserDoc(user.uid);
  const canModerate = userDoc?.role === "owner" || userDoc?.role === "moderator";
  if (comment.authorId !== user.uid && !canModerate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await commentRef.delete();

  const postSnap = await adminDb().collection("posts").doc(postId).get();
  if (postSnap.exists) {
    const nextCount = Math.max(0, (postSnap.data().commentCount || 0) - 1);
    await adminDb()
      .collection("posts")
      .doc(postId)
      .update({ commentCount: nextCount })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}