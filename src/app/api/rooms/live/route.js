import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { listRooms } from "@/lib/server/rooms";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const rooms = await listRooms();
  const live = rooms
    .filter((room) => room.status === "active")
    .slice(0, 5)
    .map((room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      kind: room.kind || "standard",
    }));

  return NextResponse.json({ rooms: live });
}
