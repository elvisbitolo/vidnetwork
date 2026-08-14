import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const ref = adminDb().collection("posts").doc(id);
  const post = await ref.get();
  if (!post.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const bookmarks = { ...(post.data().bookmarks || {}) };
  const bookmarked = !bookmarks[user.uid];
  if (bookmarked) {
    bookmarks[user.uid] = new Date().toISOString();
  } else {
    delete bookmarks[user.uid];
  }
  await ref.update({ bookmarks });

  return NextResponse.json({ bookmarked, count: Object.keys(bookmarks).length });
}
