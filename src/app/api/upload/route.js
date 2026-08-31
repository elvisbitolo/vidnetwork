import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const limited = rateLimitGuard(`upload:${auth.user.uid}`, { limit: 20 });
  if (limited) return limited;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "music" ? "music" : "avatar";

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (kind === "avatar" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 400 });
  }

  // Graceful degradation: without a Blob token, keep storing base64 in Firestore.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
    return NextResponse.json({ dataUrl });
  }

  const { put } = await import("@vercel/blob");
  let ext = (file.name || "").split(".").pop() || "bin";
  ext = (ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin").toLowerCase();
  const pathname = `uploads/${kind}/${auth.user.uid}/${Date.now()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url });
}