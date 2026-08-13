import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { listNotifications } from "@/lib/server/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const notifications = await listNotifications(user.uid);
  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      actorName: n.actorName,
      targetId: n.targetId,
      href: n.href,
      text: n.text,
      read: n.read,
      createdAt:
        n.createdAt instanceof Date
          ? n.createdAt.toISOString()
          : new Date(n.createdAt.toMillis ? n.createdAt.toMillis() : n.createdAt).toISOString(),
    })),
  });
}
