import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getRoomBySlug } from "@/lib/server/rooms";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { slug } = await req.json();
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Room required" }, { status: 400 });
  }

  const room = await getRoomBySlug(slug);
  if (!room || room.status !== "active") {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json(
      { error: "Active membership required" },
      { status: 403 }
    );
  }

  let canPublish = true;
  if (room.groupId) {
    const userDoc = await getUserDoc(user.uid);
    const isOwner = userDoc?.role === "owner";
    const memberSnap = await adminDb()
      .collection("groupMembers")
      .doc(`${room.groupId}_${user.uid}`)
      .get();
    if (!isOwner && !memberSnap.exists) {
      return NextResponse.json(
        { error: "Join the group first" },
        { status: 403 }
      );
    }
  }

  const userDoc = await getUserDoc(user.uid);
  const isOwner = userDoc?.role === "owner";
  if (room.kind === "broadcast" && !isOwner) {
    canPublish = false;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const identity = user.uid;
  const displayName =
    user.displayName || user.email?.split("@")[0] || "Member";

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: "10m",
  });
  at.addGrant({
    room: room.slug,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    token: await at.toJwt(),
    serverUrl: process.env.LIVEKIT_URL,
    room: room.slug,
    kind: room.kind || "standard",
    canPublish,
  });
}
