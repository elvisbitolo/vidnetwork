import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/server/email";

export async function POST(req, { params }) {
  const { id: postId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Comment text required" }, { status: 400 });
  }

  const postSnap = await adminDb().collection("posts").doc(postId).get();
  if (!postSnap.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const post = postSnap.data();

  const userDoc = await getUserDoc(user.uid);
  const commentRef = await adminDb().collection("posts").doc(postId).collection("comments").add({
    authorId: user.uid,
    authorName: userDoc?.name || user.name || user.email?.split("@")[0] || "Member",
    text: text.trim(),
    createdAt: new Date(),
  });

  if (post.authorId !== user.uid) {
    await createNotification({
      userId: post.authorId,
      type: "comment",
      actorId: user.uid,
      actorName: userDoc?.name || user.name || user.email?.split("@")[0] || "Member",
      targetId: postId,
      href: `/feed`,
      text: `commented on your post`,
    });

    const postAuthorDoc = await adminDb().collection("users").doc(post.authorId).get();
    if (postAuthorDoc.exists) {
      const author = postAuthorDoc.data();
      if (author.email && author.notifications !== "off") {
        await sendEmail({
          to: author.email,
          subject: `New comment on your post`,
          text: `${userDoc?.name || user.name} commented: "${text.trim()}"\n\nView it in the community feed.`,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ id: commentRef.id });
}
