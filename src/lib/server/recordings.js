import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminDb } from "@/lib/firebase/admin";
import { isSpaceMember } from "@/lib/server/spaces";

export function getS3Config() {
  const region = process.env.LIVEKIT_EGRESS_S3_REGION;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET;
  const key = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET;
  if (!region || !bucket || !key || !secret) return null;
  return { region, bucket, key, secret };
}

async function isGroupMember(groupId, uid) {
  if (!groupId) return false;
  const snap = await adminDb().collection("groupMembers").doc(`${groupId}_${uid}`).get();
  return snap.exists;
}

export async function canAccessRecording(rec, userDoc, uid) {
  if (userDoc?.role === "owner" || userDoc?.role === "moderator") return true;
  if (rec.visibility === "owner") return false;
  if (rec.spaceId) return !!(await isSpaceMember(rec.spaceId, uid));
  if (rec.groupId) return await isGroupMember(rec.groupId, uid);
  return true;
}

export async function signedDownloadUrl(rec) {
  const cfg = getS3Config();
  if (!cfg || !rec.filepath) {
    const host = process.env.LIVEKIT_EGRESS_S3_PUBLIC_URL || "";
    return host && rec.filepath ? `${host}/${rec.filepath}` : null;
  }
  const s3 = new S3Client({
    region: cfg.region,
    credentials: { accessKeyId: cfg.key, secretAccessKey: cfg.secret },
  });
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: cfg.bucket, Key: rec.filepath }),
    { expiresIn: 3600 }
  );
}

export async function deleteS3Object(filepath) {
  const cfg = getS3Config();
  if (!cfg || !filepath) return false;
  const s3 = new S3Client({
    region: cfg.region,
    credentials: { accessKeyId: cfg.key, secretAccessKey: cfg.secret },
  });
  await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: filepath }));
  return true;
}
