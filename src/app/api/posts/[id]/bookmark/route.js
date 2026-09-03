import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { canAccessPost } from "@/lib/server/posts";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userDoc = await getUserDoc(user.uid);
  const access = await canAccessPost(id, user.uid, userDoc);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const limited = rateLimitGuard(`bookmark:${user.uid}`, { limit: 60 });
  if (limited) return limited;

  const ref = adminDb().collection("posts").doc(id);
  const post = await ref.get();
  if (!post.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const bookmarks = post.data().bookmarks || {};
  const bookmarked = !bookmarks[user.uid];
  await ref.update({
    [`bookmarks.${user.uid}`]: bookmarked ? new Date() : FieldValue.delete(),
  });

  const count = bookmarked ? Object.keys(bookmarks).length + 1 : Object.keys(bookmarks).length - 1;
  return NextResponse.json({ bookmarked, count });
}
