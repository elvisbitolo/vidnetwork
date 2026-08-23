import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const ALWAYS_ON_SLUG = "community-lounge-247";

export async function GET() {
  const snap = await adminDb()
    .collection("rooms")
    .where("slug", "==", ALWAYS_ON_SLUG)
    .limit(1)
    .get();

  if (snap.empty) return new NextResponse("Not found", { status: 404 });

  const data = snap.docs[0].data();
  const musicUrl = data.musicUrl;

  if (!musicUrl || !musicUrl.startsWith("data:")) {
    return new NextResponse("No uploaded audio", { status: 404 });
  }

  const match = musicUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new NextResponse("Invalid data", { status: 400 });

  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
