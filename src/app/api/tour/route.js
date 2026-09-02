import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";
import { logError } from "@/lib/server/log";

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

  try {
    await adminDb().collection("users").doc(auth.user.uid).set(update, { merge: true });
  } catch (err) {
    logError("tour.update_failed", { error: err.message, uid: auth.user.uid });
    return NextResponse.json({ error: "Could not save tour state" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
