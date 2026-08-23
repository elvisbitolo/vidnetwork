import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const ALWAYS_ON_SLUG = "community-lounge-247";

async function findRoom() {
  const snap = await adminDb()
    .collection("rooms")
    .where("slug", "==", ALWAYS_ON_SLUG)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

export async function GET() {
  const room = await findRoom();
  if (!room) return NextResponse.json({ music: null });
  const data = room.data();
  return NextResponse.json({
    music: data.musicUrl || null,
    musicFileId: data.musicFileId || null,
    musicName: data.musicName || null,
    musicPlaying: !!data.musicPlaying,
  });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { musicUrl, musicFileId, musicName, musicPlaying } = await req.json();
  const room = await findRoom();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const update = {};
  if (typeof musicName === "string") update.musicName = musicName;
  if (typeof musicUrl === "string") update.musicUrl = musicUrl;
  if (typeof musicFileId === "string") update.musicFileId = musicFileId;
  if (typeof musicPlaying === "boolean") update.musicPlaying = musicPlaying;

  await room.ref.set(update, { merge: true });
  return NextResponse.json({ ok: true });
}
