import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { markNotificationRead } from "@/lib/server/notifications";

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const ok = await markNotificationRead(id, user.uid);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
