import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/authorize";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const ALLOWED_AUDIO = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/mp4",
  "audio/flac",
  "audio/midi",
  "audio/x-midi",
]);

export async function GET(req) {
  const auth = await requireUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const doc = await adminDb().collection("musicFiles").doc(id).get();
  if (!doc.exists) return new NextResponse("Not found", { status: 404 });

  const data = doc.data();
  const match = data.dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new NextResponse("Invalid data", { status: 400 });

  const contentType = match[1].toLowerCase();
  if (!ALLOWED_AUDIO.has(contentType)) {
    return new NextResponse("Not allowed", { status: 415 });
  }

  const buffer = Buffer.from(match[2], "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
