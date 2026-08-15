import { NextResponse } from "next/server";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { listRooms } from "@/lib/server/rooms";
import { listEvents } from "@/lib/server/events";
import { listCourses } from "@/lib/server/courses";
import { listGroups } from "@/lib/server/groups";
import { listSpaces } from "@/lib/server/spaces";

export async function GET() {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const [rooms, events, courses, groups, spaces] = await Promise.all([
    listRooms(),
    listEvents(),
    listCourses(true),
    listGroups(),
    listSpaces(),
  ]);

  const pick = (items, extra = {}) =>
    items.map((item) => ({
      id: item.id,
      name: item.title || item.name || "Untitled",
      ...(typeof extra === "function" ? extra(item) : extra),
    }));

  return NextResponse.json({
    scopes: {
      room: pick(rooms, (r) => ({ slug: r.slug })),
      event: pick(events, (e) => ({ startTime: e.startTime?.toMillis?.() || 0 })),
      course: pick(courses),
      group: pick(groups, (g) => ({ slug: g.slug })),
      space: pick(spaces, (s) => ({ slug: s.slug })),
    },
  });
}
