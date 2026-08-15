import { NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/server/events";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";
import { getSpace } from "@/lib/server/spaces";
import { serialize } from "@/lib/server/serialize";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;
  const events = await listEvents();
  return NextResponse.json({ events: serialize(events) });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { title, description = "", startTime, endTime = null, roomSlug = "", capacity = 0, recurrence = null, spaceId = "", purchasePriceCents = 0, publicPreview = false } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Event title required" }, { status: 400 });
  }
  const parsed = Date.parse(startTime);
  if (!Number.isFinite(parsed)) {
    return NextResponse.json({ error: "A valid start time is required" }, { status: 400 });
  }
  const price = Number(purchasePriceCents) || 0;
  if (price < 0 || price > 1000000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }
  if (spaceId) {
    const space = await getSpace(spaceId);
    if (!space || space.status !== "active") {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }
  }

  const event = await createEvent({
    title,
    description,
    startTime,
    endTime,
    roomSlug,
    capacity,
    recurrence,
    spaceId,
    purchasePriceCents: price,
    publicPreview,
    createdBy: auth.user.uid,
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "event.created",
    targetId: event.id,
    metadata: { title, startTime, spaceId, recurrence, purchasePriceCents: price },
  });

  return NextResponse.json({ event });
}
