import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const VALID_TOURS = ["initial", "dashboard"];

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const doc = await adminDb().collection("users").doc(auth.user.uid).get();
  const data = doc.exists ? doc.data() : {};
  const ob = data.onboarding || {};

  return NextResponse.json({
    completed: !!ob.completed,
    skipped: !!ob.skipped,
    currentTour: ob.currentTour || "",
    currentStep: Number(ob.currentStep) || 0,
    completedTours: Array.isArray(ob.completedTours) ? ob.completedTours : [],
    version: Number(ob.version) || 0,
  });
}

export async function PATCH(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  const update = {};

  if (typeof body.currentStep === "number" && body.currentStep >= 0) {
    update["onboarding.currentStep"] = body.currentStep;
  }
  if (typeof body.currentTour === "string" && VALID_TOURS.includes(body.currentTour)) {
    update["onboarding.currentTour"] = body.currentTour;
  }
  if (body.skipped === true) {
    update["onboarding.skipped"] = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await adminDb().collection("users").doc(auth.user.uid).set(update, { merge: true });

  return NextResponse.json({ ok: true });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = body.action;

  if (action === "reset") {
    await adminDb()
      .collection("users")
      .doc(auth.user.uid)
      .set(
        { "onboarding.completed": false, "onboarding.skipped": false, "onboarding.currentStep": 0, "onboarding.currentTour": "" },
        { merge: true }
      );
    return NextResponse.json({ ok: true, reset: true });
  }

  if (action === "complete") {
    const tour = typeof body.tour === "string" ? body.tour : "";
    const update = { "onboarding.completed": true, "onboarding.skipped": false, "onboarding.currentTour": "" };
    if (tour && VALID_TOURS.includes(tour)) {
      update[`onboarding.completedTours`] = adminDb().FieldValue.arrayUnion(tour);
    }
    await adminDb().collection("users").doc(auth.user.uid).set(update, { merge: true });
    return NextResponse.json({ ok: true, completed: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}