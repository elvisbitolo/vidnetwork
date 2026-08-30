import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { requireActiveMember, guardJson } from "@/lib/server/authorize";
import { deletePostWithComments } from "@/lib/server/delete";
import { logError } from "@/lib/server/log";

export async function DELETE(req, { params }) {
  const { id } = await params;

  const auth = await requireActiveMember();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("posts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const post = snap.data();
  const canModerate = auth.userDoc?.role === "owner" || auth.userDoc?.role === "moderator";
  if (post.authorId !== auth.user.uid && !canModerate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deletePostWithComments(ref);
  } catch (err) {
    logError("posts.delete_failed", { postId: id, uid: auth.user.uid, error: err.message });
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}