import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getRoomBySlug } from "@/lib/server/rooms";
import { getSpace, isSpaceMember } from "@/lib/server/spaces";
import { getUpcomingRoomStart } from "@/lib/server/events";
import {
  requireActiveMember,
  requireGroupMember,
  guardJson,
} from "@/lib/server/authorize";
import { meetsTier } from "@/lib/server/plans";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function POST(req) {
  const auth = await requireActiveMember();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimitGuard(`livekit-token:${auth.user.uid}`, { limit: 20 });
  if (limited) return limited;
  const limitedIp = rateLimitGuard(`livekit-token-ip:${ip}`, { limit: 100 });
  if (limitedIp) return limitedIp;

  const { slug } = await req.json();
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Room required" }, { status: 400 });
  }

  const room = await getRoomBySlug(slug);
  if (!room || room.status !== "active") {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isOwner = auth.userDoc?.role === "owner";
  const isHost = isOwner || auth.userDoc?.role === "moderator";

  const opensAt = await getUpcomingRoomStart(room.slug);
  if (opensAt && !isHost) {
    return NextResponse.json(
      { error: "This room opens at the scheduled time", opensAt },
      { status: 423 }
    );
  }

  if (room.spaceId) {
    const space = await getSpace(room.spaceId);
    if (!space || space.status !== "active") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (!isOwner) {
      const membership = await isSpaceMember(room.spaceId, auth.user.uid);
      if (!membership) {
        return NextResponse.json({ error: "Join the space first" }, { status: 403 });
      }
      if (space.requiredTier && !meetsTier(auth.sub?.tier || "standard", space.requiredTier)) {
        return NextResponse.json({ error: "Premium membership required" }, { status: 403 });
      }
    }
  }

  if (room.groupId && !isOwner) {
    const groupAuth = await requireGroupMember(room.groupId);
    const groupDenied = guardJson(groupAuth);
    if (groupDenied) return groupDenied;
  }

  let canPublish = true;
  if (room.kind === "broadcast" && !isOwner) {
    canPublish = false;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const identity = auth.user.uid;
  const displayName =
    auth.user.displayName || auth.user.email?.split("@")[0] || "Member";

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
