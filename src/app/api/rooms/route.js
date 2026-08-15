import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listRooms, createRoom } from "@/lib/server/rooms";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { getScopedHostRights } from "@/lib/server/hosts";
import { logAudit } from "@/lib/server/audit";
import { getSpace } from "@/lib/server/spaces";
import { serialize } from "@/lib/server/serialize";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;
  const rooms = await listRooms();
  return NextResponse.json({ rooms: serialize(rooms) });
}

function isStaff(auth) {
  return auth.userDoc?.role === "owner" || auth.userDoc?.role === "moderator";
}

async function canCreateInScope(uid, groupId, spaceId) {
  if (groupId) {
    const rights = await getScopedHostRights(uid, "group", groupId);
    return rights.isHost;
  }
  if (spaceId) {
    const rights = await getScopedHostRights(uid, "space", spaceId);
    return rights.isHost;
  }
  return false;
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { name, description = "", maxParticipants = 20, groupId = "", spaceId = "", kind = "standard", publicPreview = false, opensAt = null, recordingAllowed = true, replayVisibility = "members" } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Room name required" }, { status: 400 });
  }
  if (groupId && spaceId) {
    return NextResponse.json({ error: "A room belongs to a group OR a space, not both" }, { status: 400 });
  }
  const staff = isStaff(auth);
  if (!staff && !(await canCreateInScope(auth.user.uid, groupId, spaceId))) {
    return NextResponse.json(
      { error: "Only staff or the host of the room's group or space can create rooms" },
      { status: 403 }
    );
  }
  if (groupId) {
    const groupSnap = await adminDb().collection("groups").doc(groupId).get();
    if (!groupSnap.exists || groupSnap.data().status !== "active") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
  }
  if (spaceId) {
    const space = await getSpace(spaceId);
    if (!space || space.status !== "active") {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }
  }

  const parsedOpensAt = opensAt ? new Date(opensAt) : null;
  if (parsedOpensAt && Number.isNaN(parsedOpensAt.getTime())) {
    return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
  }

  const room = await createRoom({
    name,
    description,
    maxParticipants: Number(maxParticipants) || 20,
    groupId,
    spaceId,
    kind,
    publicPreview,
    opensAt: parsedOpensAt,
    recordingAllowed: !!recordingAllowed,
    replayVisibility: replayVisibility === "owner" ? "owner" : "members",
    createdBy: auth.user.uid,
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.created",
    targetId: room.id,
    metadata: { name, slug: room.slug, groupId, spaceId, kind, opened: !!parsedOpensAt },
  });

  return NextResponse.json({ room });
}
