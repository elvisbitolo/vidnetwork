import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getEvent } from "@/lib/server/events";
import { canManageScope } from "@/lib/server/hosts";
import { logAudit } from "@/lib/server/audit";

export async function PATCH(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!(await canManageScope(user.uid, "event", id))) {
    return NextResponse.json({ error: "Event host access required" }, { status: 403 });
  }
  const { publicPreview } = await req.json();
  if (typeof publicPreview !== "boolean") {
    return NextResponse.json({ error: "publicPreview must be a boolean" }, { status: 400 });
  }
  await adminDb().collection("events").doc(id).update({ publicPreview, updatedAt: new Date() });
  await logAudit({
    actorId: user.uid,
    actorName: user.displayName || user.email || "",
    action: "event.updated",
    targetId: id,
    metadata: { publicPreview },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!(await canManageScope(user.uid, "event", id))) {
    return NextResponse.json({ error: "Event host access required" }, { status: 403 });
  }
  await adminDb().collection("events").doc(id).delete();
  return NextResponse.json({ ok: true });
}
