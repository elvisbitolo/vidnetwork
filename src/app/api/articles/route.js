import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";
import { extractHashtags } from "@/lib/server/hashtags";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { isValidImageUrl } from "@/lib/server/posts-core";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const authorId = searchParams.get("authorId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  let query = adminDb().collection("articles").orderBy("createdAt", "desc");
  if (authorId) {
    query = query.where("authorId", "==", authorId);
  }
  const snap = await query.limit(limit).get();

  const articles = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title || "",
      excerpt: d.excerpt || "",
      authorId: d.authorId || "",
      authorName: d.authorName || "Member",
      coverImage: d.coverImage || "",
      hashtags: d.hashtags || [],
      readTime: d.readTime || 1,
      createdAt: d.createdAt?.toMillis
        ? d.createdAt.toMillis()
        : d.createdAt
          ? new Date(d.createdAt).getTime()
          : 0,
    };
  });

  return NextResponse.json({ articles });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const limited = rateLimitGuard(`article:${auth.user.uid}`, { limit: 10 });
  if (limited) return limited;

  const { title, content, excerpt, coverImage } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const cleanTitle = title.trim().slice(0, 200);
  const cleanContent = content.trim();
  const cleanExcerpt = (excerpt || content.slice(0, 300)).trim().slice(0, 300);
  const cleanCover = typeof coverImage === "string" ? coverImage.trim() : "";
  if (cleanCover && !isValidImageUrl(cleanCover)) {
    return NextResponse.json({ error: "Invalid cover image URL" }, { status: 400 });
  }
  const wordCount = cleanContent.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const authorName = auth.userDoc?.name || auth.user.email || "Member";

  const ref = await adminDb().collection("articles").add({
    title: cleanTitle,
    content: cleanContent,
    excerpt: cleanExcerpt,
    coverImage: cleanCover,
    authorId: auth.user.uid,
    authorName,
    hashtags: extractHashtags(cleanTitle + " " + cleanContent),
    readTime,
    likes: {},
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
