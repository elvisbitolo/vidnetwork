import { NextResponse } from "next/server";
import { getRoom } from "@/lib/server/rooms";
import { requireScopeHost, guardJson } from "@/lib/server/authorize";
import { endLiveKitRoom } from "@/lib/server/livekit";
import { logAudit } from "@/lib/server/audit";

export async function POST(req, { params }) {
  const { id } = await params;
  const auth = await requireScopeHost({ scopeType: "room", scopeId: id });
  const denied = guardJson(auth);
  if (denied) return denied;

  const room = await getRoom(id);
  if (!room || room.status !== "active") {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let result;
  try {
    result = await endLiveKitRoom(room.slug);
  } catch {
    result = { ok: false, error: "Could not end the room" };
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.ended",
    targetId: room.id,
    metadata: { roomSlug: room.slug },
  });

  return NextResponse.json({ ok: true });
}
