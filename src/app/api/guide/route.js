import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const doc = await adminDb().collection("users").doc(auth.user.uid).get();
  const data = doc.exists ? doc.data() : {};

  return NextResponse.json({
    guideCompleted: !!data.guideCompleted,
    guideStep: data.guideStep || 0,
    profileCompleted: !!data.profileCompleted,
  });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { step, completed } = await req.json();

  const update = {};
  if (typeof step === "number") update.guideStep = step;
  if (completed === true) {
    update.guideCompleted = true;
    update.guideCompletedAt = new Date();
  }

  await adminDb().collection("users").doc(auth.user.uid).set(update, { merge: true });

  return NextResponse.json({ ok: true });
}
