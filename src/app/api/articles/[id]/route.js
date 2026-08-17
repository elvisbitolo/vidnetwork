import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req, { params }) {
  const { id } = await params;
  const doc = await adminDb().collection("articles").doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const d = doc.data();
  return NextResponse.json({
    id: doc.id,
    title: d.title || "",
    content: d.content || "",
    excerpt: d.excerpt || "",
    coverImage: d.coverImage || "",
    authorId: d.authorId || "",
    authorName: d.authorName || "Member",
    hashtags: d.hashtags || [],
    readTime: d.readTime || 1,
    likes: Object.keys(d.likes || {}),
    createdAt: d.createdAt?.toMillis
      ? d.createdAt.toMillis()
      : d.createdAt
        ? new Date(d.createdAt).getTime()
        : 0,
  });
}
