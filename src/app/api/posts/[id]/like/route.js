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
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const data = snap.data();
  const likes = data.likes || {};
  const already = !!likes[user.uid];
  const update = already
    ? { [`likes.${user.uid}`]: adminDb().FieldValue.delete() }
    : { [`likes.${user.uid}`]: new Date() };

  await ref.update(update);

  if (!already && data.authorId && data.authorId !== user.uid) {
    const { createNotification } = await import("@/lib/server/notifications");
    const userDoc = await adminDb().collection("users").doc(user.uid).get();
    const actorName = userDoc.exists
      ? userDoc.data().name || user.email?.split("@")[0] || "Member"
      : user.email?.split("@")[0] || "Member";
    await createNotification({
      userId: data.authorId,
      type: "like",
      actorId: user.uid,
      actorName,
      targetId: id,
      href: `/feed`,
      text: `Liked your post`,
    });
  }

  return NextResponse.json({ liked: !already, count: Object.keys(likes).length + (already ? -1 : 1) });
}
