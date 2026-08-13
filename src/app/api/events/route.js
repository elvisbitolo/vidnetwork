import { NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/server/events";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;
  const events = await listEvents();
  return NextResponse.json({ events });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { title, description = "", startTime, endTime = null, roomSlug = "", capacity = 0, recurrence = null } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Event title required" }, { status: 400 });
  }
  const parsed = Date.parse(startTime);
  if (!Number.isFinite(parsed)) {
    return NextResponse.json({ error: "A valid start time is required" }, { status: 400 });
  }

  const event = await createEvent({
    title,
    description,
    startTime,
    endTime,
    roomSlug,
    capacity,
    recurrence,
    createdBy: auth.user.uid,
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "event.created",
    targetId: event.id,
    metadata: { title, startTime, recurrence },
  });

  return NextResponse.json({ event });
}
