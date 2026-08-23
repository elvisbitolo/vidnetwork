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
  const tours = data.tours || {};

  return NextResponse.json({
    dashboard: !!tours.dashboard?.completed,
  });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { tour, completed } = await req.json();

  const update = {};
  if (completed === true) {
    update[`tours.${tour}`] = { completed: true, at: new Date() };
  }

  await adminDb().collection("users").doc(auth.user.uid).set(update, { merge: true });

  return NextResponse.json({ ok: true });
}
