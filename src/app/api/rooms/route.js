import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { listRooms, createRoom } from "@/lib/server/rooms";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const rooms = await listRooms();
  return NextResponse.json({ rooms });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    createdBy: user.uid,
  });
  return NextResponse.json({ room });
}
