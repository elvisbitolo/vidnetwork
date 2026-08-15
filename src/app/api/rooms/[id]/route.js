import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";
import { deleteRoom } from "@/lib/server/rooms";

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("rooms").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const { publicPreview } = await req.json();
  if (typeof publicPreview !== "boolean") {
    return NextResponse.json({ error: "publicPreview must be a boolean" }, { status: 400 });
  }
  await ref.update({ publicPreview, updatedAt: new Date() });
  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.updated",
    targetId: id,
    metadata: { publicPreview },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("rooms").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const room = snap.data();
  await deleteRoom({ id, slug: room.slug, name: room.name });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.deleted",
    targetId: id,
    metadata: { name: room.name || "" },
  });

  return NextResponse.json({ ok: true });
}
