import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { canModerate } from "@/lib/server/auth";
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
    adminDb().collectionGroup("comments").limit(3000).get(),
    listEvents(),
    listSpaces(),
    getLeaderboard(6),
  ]);

  const commentCountByPost = {};
  commentsSnap.docs.forEach((doc) => {
    const postId = doc.ref.path.split("/")[1];
    commentCountByPost[postId] = (commentCountByPost[postId] || 0) + 1;
  });

  const role = auth.userDoc?.role || "member";
  const isStaff = canModerate(auth.userDoc);

  const [spaceSnap, groupSnap] = await Promise.all([
    adminDb().collection("spaceMembers").where("userId", "==", auth.user.uid).limit(500).get(),
    adminDb().collection("groupMembers").where("userId", "==", auth.user.uid).limit(500).get(),
  ]);
  const memberships = {
    spaceIds: new Set(spaceSnap.docs.map((d) => d.data().spaceId)),
    groupIds: new Set(groupSnap.docs.map((d) => d.data().groupId)),
  };

  const canReadPost = (post) => {
    if (isStaff || post.authorId === auth.user.uid) return true;
    if (post.spaceId && !memberships.spaceIds.has(post.spaceId)) return false;
    if (post.groupId && !memberships.groupIds.has(post.groupId)) return false;
    return true;
  };

  const visibleSpaces = spaces.filter(
    (space) => isStaff || space.publicPreview || space.access !== "invite"
  );

  const posts = postsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data(), commentCount: commentCountByPost[doc.id] || 0 }))
    .filter((post) => post.status !== "deleted")
    .filter(canReadPost);

  const featured = posts
    .filter((post) => post.pinned)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 6)
    .map(postCard);

  const topPosts = rankTopPosts(posts).slice(0, 6).map(postCard);

  const now = Date.now();
  const upcomingEvents = events
    .filter((event) => event.status !== "deleted")
    .filter(
      (event) =>
        isStaff ||
        !event.spaceId ||
        event.publicPreview ||
        memberships.spaceIds.has(event.spaceId)
    )
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
    visibleSpaces.map(async (space) => {
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
