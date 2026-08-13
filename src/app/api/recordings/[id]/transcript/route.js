import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireActiveMember, guardJson } from "@/lib/server/authorize";

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireActiveMember();
  const denied = guardJson(auth);
  if (denied) return denied;

  const snap = await adminDb().collection("recordings").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  const data = snap.data();
  if (data.status !== "complete" || data.transcriptionStatus !== "complete") {
    return NextResponse.json({ transcript: null }, { status: 200 });
  }

  return NextResponse.json({
    transcript: data.transcript || "",
    roomName: data.roomName || "",
    roomSlug: data.roomSlug || "",
    startedAt: data.startedAt || null,
  });
}
