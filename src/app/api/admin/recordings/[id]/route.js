import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";
import { deleteS3Object } from "@/lib/server/recordings";

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("recordings").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  const data = snap.data();
  if (!["complete", "failed"].includes(data.status)) {
    return NextResponse.json(
      { error: "Cannot delete a recording while it is active" },
      { status: 400 }
    );
  }

  if (data.filepath) {
    const deleted = await deleteS3Object(data.filepath);
    if (!deleted) {
      return NextResponse.json(
        { error: "Recording metadata kept — S3 storage not configured, so the file was not deleted." },
        { status: 501 }
      );
    }
  }

  await ref.delete();

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "recording.deleted",
    targetId: id,
    metadata: { roomSlug: data.roomSlug, filepath: data.filepath || "" },
  });

  return NextResponse.json({ ok: true });
}
