import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listRooms, createRoom } from "@/lib/server/rooms";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;
  const rooms = await listRooms();
  return NextResponse.json({ rooms });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { name, description = "", maxParticipants = 20, groupId = "", kind = "standard" } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Room name required" }, { status: 400 });
  }
  if (groupId) {
    const groupSnap = await adminDb().collection("groups").doc(groupId).get();
    if (!groupSnap.exists || groupSnap.data().status !== "active") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const room = await createRoom({
    name,
    description,
    maxParticipants: Number(maxParticipants) || 20,
    groupId,
    kind,
    createdBy: auth.user.uid,
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.created",
    targetId: room.id,
    metadata: { name, slug: room.slug, groupId, kind },
  });

  return NextResponse.json({ room });
}
