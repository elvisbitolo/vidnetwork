import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getEvent } from "@/lib/server/events";

function escapeIcs(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsDate(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/g, "");
}

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const start = new Date(event.startTime.toMillis ? event.startTime.toMillis() : event.startTime);
  const end = event.endTime
    ? new Date(event.endTime.toMillis ? event.endTime.toMillis() : event.endTime)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const uid = `${event.id}@yarnerylounge.app`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vidnetwork//Community Events//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const safeName = String(event.title || "event")
    .replace(/[^\w .\-()]/g, "_")
    .slice(0, 60) || "event";
  const encoded = encodeURIComponent(safeName).replace(/['()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"; filename*=UTF-8''${encoded}.ics`,
    },
  });
}
