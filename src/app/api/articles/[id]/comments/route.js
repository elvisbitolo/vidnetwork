import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { validateCommentText } from "@/lib/server/posts-core";
import { createNotification } from "@/lib/server/notifications";

export async function GET(req, { params }) {
  const { id } = await params;
  const snap = await adminDb()
    .collection("articles")
    .doc(id)
    .collection("comments")
    .orderBy("createdAt", "asc")
    .get();
  const comments = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ comments });
}

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitGuard(`article-comment:${user.uid}`, { limit: 20 });
  if (limited) return limited;

  const { text } = await req.json();
  const check = validateCommentText(text);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const userDoc = await adminDb().collection("users").doc(user.uid).get();
  const authorName = userDoc.exists
    ? userDoc.data().name || user.name || user.email?.split("@")[0] || "Member"
    : user.email?.split("@")[0] || "Member";

  const articleDoc = await adminDb().collection("articles").doc(id).get();
  if (!articleDoc.exists) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  const article = articleDoc.data();

  const commentRef = await adminDb().collection("articles").doc(id).collection("comments").add({
    authorId: user.uid,
    authorName,
    text: check.text,
    createdAt: new Date(),
  });

  if (article.authorId && article.authorId !== user.uid) {
    await createNotification({
      userId: article.authorId,
      type: "comment",
      actorId: user.uid,
      actorName: authorName,
      targetId: id,
      href: `/articles/${id}`,
      text: "commented on your article",
    });
  }

  return NextResponse.json({ id: commentRef.id });
}
