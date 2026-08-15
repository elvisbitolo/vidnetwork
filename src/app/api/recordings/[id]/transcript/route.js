import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { canAccessRecording } from "@/lib/server/recordings";
import { serializeTimestamp } from "@/lib/server/serialize";

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
  const data = snap.data();

  const userDoc = await getUserDoc(user.uid);
  if (!(await canAccessRecording(data, userDoc, user.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (data.status !== "complete" || data.transcriptionStatus !== "complete") {
    return NextResponse.json({ transcript: null }, { status: 200 });
  }

  return NextResponse.json({
    transcript: data.transcript || "",
    roomName: data.roomName || "",
    roomSlug: data.roomSlug || "",
    startedAt: serializeTimestamp(data.startedAt),
  });
}
