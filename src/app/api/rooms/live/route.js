import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { listRooms } from "@/lib/server/rooms";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const now = Date.now();
  const rooms = await listRooms();
  const isLiveNow = (room) => {
    if (room.alwaysOn) return false;
    if (!room.opensAt) return true;
    const t = room.opensAt?.toMillis
      ? room.opensAt.toMillis()
      : typeof room.opensAt === "number"
        ? room.opensAt
        : Number.NaN;
    return Number.isFinite(t) ? t <= now : true;
  };

  const live = rooms
    .filter((room) => room.status === "active" && isLiveNow(room))
    .sort((a, b) => {
      const aBroadcast = (a.kind || "standard") === "broadcast" ? 0 : 1;
      const bBroadcast = (b.kind || "standard") === "broadcast" ? 0 : 1;
      if (aBroadcast !== bBroadcast) return aBroadcast - bBroadcast;
      return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    })
    .slice(0, 5)
    .map((room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      kind: room.kind || "standard",
    }));

  return NextResponse.json({ rooms: live });
}
