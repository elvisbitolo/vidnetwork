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

  return NextResponse.json({ theme: data.dashboardTheme || null });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { theme } = await req.json();

  if (!theme || typeof theme !== "object") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const allowed = ["bg", "surface", "border", "text", "muted", "accent"];
  const safe = {};
  for (const key of allowed) {
    if (typeof theme[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(theme[key])) {
      safe[key] = theme[key].toLowerCase();
    }
  }

  await adminDb().collection("users").doc(auth.user.uid).set(
    { dashboardTheme: safe },
    { merge: true }
  );

  return NextResponse.json({ ok: true, theme: safe });
}
