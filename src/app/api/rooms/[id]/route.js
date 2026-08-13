import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("rooms").doc(id);
  const snap = await ref.get();
  await ref.delete();

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.deleted",
    targetId: id,
    metadata: { name: snap.exists ? snap.data().name : "" },
  });

  return NextResponse.json({ ok: true });
}
