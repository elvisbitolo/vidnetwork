import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const snap = await adminDb()
    .collection("posts")
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();

  const tagCounts = {};
  snap.docs.forEach((doc) => {
    const tags = doc.data().hashtags || [];
    tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topics = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return NextResponse.json({ topics });
}
