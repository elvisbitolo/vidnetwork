import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { transcribeRecording } from "@/lib/server/transcription";

export async function POST(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const snap = await adminDb().collection("recordings").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  const data = snap.data();
  if (data.status !== "complete") {
    return NextResponse.json(
      { error: "Cannot transcribe a recording that is not complete" },
      { status: 400 }
    );
  }

  const result = await transcribeRecording({ id, ...data });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result);
}
