import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";

export const dynamic = "force-dynamic";

const ALWAYS_ON_SLUG = "community-lounge-247";
const ALWAYS_ON_NAME = "New members";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const snap = await adminDb()
    .collection("rooms")
    .where("slug", "==", ALWAYS_ON_SLUG)
    .limit(1)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    if (doc.data().name !== ALWAYS_ON_NAME) {
      await doc.ref.set({ name: ALWAYS_ON_NAME }, { merge: true });
    }
    return NextResponse.json({ id: doc.id, ...doc.data(), name: ALWAYS_ON_NAME });
  }

  const ref = adminDb().collection("rooms").doc();
  const room = {
    name: ALWAYS_ON_NAME,
    slug: ALWAYS_ON_SLUG,
    description: "Always open — drop in anytime for company and good vibes.",
    status: "active",
    maxParticipants: 50,
    groupId: "",
    spaceId: "",
    kind: "standard",
    publicPreview: true,
    opensAt: null,
    recordingAllowed: false,
    replayVisibility: "members",
    alwaysOn: true,
    createdBy: "system",
    createdAt: new Date(),
  };
  await ref.set(room);

  return NextResponse.json({ id: ref.id, ...room });
}
