import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

function getS3Config() {
  const region = process.env.LIVEKIT_EGRESS_S3_REGION;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET;
  const key = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET;
  if (!region || !bucket || !key || !secret) return null;
  return { region, bucket, key, secret };
}

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

  const cfg = getS3Config();
  if (cfg && data.filepath) {
    const s3 = new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.key, secretAccessKey: cfg.secret },
    });
    await s3.send(
      new DeleteObjectCommand({ Bucket: cfg.bucket, Key: data.filepath })
    );
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
