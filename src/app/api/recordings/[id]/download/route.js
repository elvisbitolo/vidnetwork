import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { canAccessRecording, signedDownloadUrl } from "@/lib/server/recordings";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const snap = await adminDb().collection("recordings").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  const rec = snap.data();
  if (rec.status !== "complete") {
    return NextResponse.json({ error: "Recording is not ready" }, { status: 400 });
  }

  const userDoc = await getUserDoc(user.uid);
  if (!(await canAccessRecording(rec, userDoc, user.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await signedDownloadUrl(rec);
  if (!url) {
    return NextResponse.json(
      { error: "Download not configured — recording storage unavailable" },
      { status: 501 }
    );
  }
  return NextResponse.redirect(url);
}
