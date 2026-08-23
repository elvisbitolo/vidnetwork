import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 750 * 1024) {
    return NextResponse.json({ error: "File too large (max 750KB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const docRef = await adminDb().collection("musicFiles").add({
    dataUrl,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedBy: auth.user.uid,
    createdAt: new Date(),
  });

  return NextResponse.json({ id: docRef.id, dataUrl });
}
