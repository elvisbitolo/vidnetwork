import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { getLeaderboard } from "@/lib/server/gamification";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function count(collectionName) {
  try {
    const snap = await adminDb().collection(collectionName).count().get();
    return snap.data().count;
  } catch {
    const fallback = await adminDb().collection(collectionName).limit(1000).get();
    return fallback.size;
  }
}

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const [users, posts, groups, spaces, rooms, events, courses, rsvps, notifications, reports] =
    await Promise.all([
      count("users"),
      count("posts"),
      count("groups"),
      count("spaces"),
      count("rooms"),
      count("events"),
      count("courses"),
      count("rsvps"),
      count("notifications"),
      count("reports"),
    ]);

  const recentPostsSnap = await adminDb()
    .collection("posts")
    .orderBy("createdAt", "desc")
    .limit(8)
    .get();
  const recentPosts = recentPostsSnap.docs.map((d) => ({
    id: d.id,
    authorName: d.data().authorName || "",
    text: (d.data().text || "").slice(0, 140),
    createdAt: toMillis(d.data().createdAt),
  }));

  const leaderboard = await getLeaderboard(5);

  return NextResponse.json({
    counts: {
      users,
      posts,
      groups,
      spaces,
      rooms,
      events,
      courses,
      rsvps,
      notifications,
      reports,
    },
    recentPosts,
    leaderboard,
  });
}
