import { NextResponse } from "next/server";
import { getRoom } from "@/lib/server/rooms";
import { requireScopeHostOrCoHost, guardJson } from "@/lib/server/authorize";
import { listLiveParticipants } from "@/lib/server/livekit";

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireScopeHostOrCoHost({ scopeType: "room", scopeId: id });
  const denied = guardJson(auth);
  if (denied) return denied;

  const room = await getRoom(id);
  if (!room || room.status !== "active") {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let participants = [];
  try {
    participants = await listLiveParticipants(room.slug);
  } catch {
    participants = [];
  }

  return NextResponse.json({ participants });
}
