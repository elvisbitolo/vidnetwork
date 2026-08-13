import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { listEvents, createEvent } from "@/lib/server/events";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const events = await listEvents();
  return NextResponse.json({ events });
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
    createdBy: user.uid,
  });
  return NextResponse.json({ event });
}
