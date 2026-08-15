import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { logAudit } from "@/lib/server/audit";

export async function PATCH(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const doc = await adminDb().collection("events").doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const { publicPreview } = await req.json();
  if (typeof publicPreview !== "boolean") {
    return NextResponse.json({ error: "publicPreview must be a boolean" }, { status: 400 });
  }
  await adminDb().collection("events").doc(id).update({ publicPreview, updatedAt: new Date() });
  await logAudit({
    actorId: user.uid,
    actorName: userDoc?.name || user.email || "",
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
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await adminDb().collection("events").doc(id).delete();
  return NextResponse.json({ ok: true });
}
