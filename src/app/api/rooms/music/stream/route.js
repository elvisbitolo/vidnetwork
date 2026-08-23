import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const doc = await adminDb().collection("musicFiles").doc(id).get();
  if (!doc.exists) return new NextResponse("Not found", { status: 404 });

  const data = doc.data();
  const match = data.dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new NextResponse("Invalid data", { status: 400 });

  const buffer = Buffer.from(match[2], "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
