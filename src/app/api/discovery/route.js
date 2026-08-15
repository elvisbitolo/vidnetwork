import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { getLeaderboard } from "@/lib/server/gamification";
import { rankTopPosts, toMillis } from "@/lib/server/analytics-core";
import { listEvents } from "@/lib/server/events";
import { listSpaces } from "@/lib/server/spaces";

function postCard(post) {
  return {
    id: post.id,
    text: (post.text || "").slice(0, 160),
    authorId: post.authorId || "",
    authorName: post.authorName || "Member",
    likeCount: Object.keys(post.likes || {}).length,
    commentCount: post.commentCount || 0,
    createdAt: toMillis(post.createdAt),
    kind: post.kind || "post",
  };
}

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const [postsSnap, commentsSnap, events, spaces, topMembers] = await Promise.all([
    adminDb().collection("posts").orderBy("createdAt", "desc").limit(60).get(),
    adminDb().collectionGroup("comments").get(),
    listEvents(),
    listSpaces(),
    getLeaderboard(6),
  ]);

  const commentCountByPost = {};
  commentsSnap.docs.forEach((doc) => {
    const postId = doc.ref.path.split("/")[1];
    commentCountByPost[postId] = (commentCountByPost[postId] || 0) + 1;
  });

  const posts = postsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data(), commentCount: commentCountByPost[doc.id] || 0 }))
    .filter((post) => post.status !== "deleted");

  const featured = posts
    .filter((post) => post.pinned)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 6)
    .map(postCard);

  const topPosts = rankTopPosts(posts).slice(0, 6).map(postCard);

  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => event.status !== "deleted")
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: (event.description || "").slice(0, 120),
      startTime: toMillis(event.startTime),
      purchasePriceCents: event.purchasePriceCents || 0,
      spaceId: event.spaceId || "",
    }))
    .filter((event) => event.startTime >= now)
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 6);

  const spaceMemberCounts = await Promise.all(
    spaces.map(async (space) => {
      const snap = await adminDb()
        .collection("spaceMembers")
        .where("spaceId", "==", space.id)
        .get();
      return {
        id: space.id,
        name: space.name,
        slug: space.slug,
        description: (space.description || "").slice(0, 120),
        memberCount: snap.size,
        purchasePriceCents: space.purchasePriceCents || 0,
      };
    })
  );
  const topSpaces = spaceMemberCounts
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 6);

  return NextResponse.json({
    discovery: {
      featured,
      upcomingEvents,
      topPosts,
      topMembers,
      topSpaces,
    },
  });
}
