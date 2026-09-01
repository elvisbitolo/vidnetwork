import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { followUser, unfollowUser, getFollowerCount, getFollowingCount } from "@/lib/server/follows";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function GET(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [following, followerCount, followingCount] = await Promise.all([
    isFollowing(user.uid, id),
    getFollowerCount(id),
    getFollowingCount(id),
  ]);

  return NextResponse.json({ following, followerCount, followingCount });
}

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitGuard(`follow:${user.uid}`, { limit: 30 });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "follow";

  let following;
  if (action === "unfollow") {
    following = (await unfollowUser(user.uid, id)).following;
  } else {
    const result = await followUser(user.uid, id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    following = result.following;
  }

  const [followerCount, followingCount] = await Promise.all([
    getFollowerCount(id),
    getFollowingCount(id),
  ]);

  return NextResponse.json({ following, followerCount, followingCount });
}
