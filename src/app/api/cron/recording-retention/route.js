import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { deleteS3Object } from "@/lib/server/recordings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const snap = await adminDb()
    .collection("recordings")
    .where("status", "in", ["complete", "failed"])
    .get();

  let expired = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const rec = doc.data();
    const retentionDays = Number(rec.retentionDays) || 0;
    if (retentionDays <= 0) continue;

    const startedAt = rec.startedAt?.toMillis ? rec.startedAt.toMillis() : new Date(rec.startedAt).getTime();
    if (!startedAt || now - startedAt < retentionDays * 24 * 60 * 60 * 1000) continue;

    if (rec.filepath) {
      const deleted = await deleteS3Object(rec.filepath);
      if (!deleted) {
        skipped++;
        continue;
      }
    }
    await doc.ref.delete();
    expired++;
  }

  return NextResponse.json({ expired, skipped });
}
