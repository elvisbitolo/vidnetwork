import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/server/auth";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function sanitizeTheme(theme) {
  if (!theme) return null;
  const out = {};
  for (const key of ["bg", "text", "border"]) {
    const value = theme[key];
    if (typeof value === "string" && HEX_COLOR.test(value)) out[key] = value.toLowerCase();
  }
  return Object.keys(out).length >= 2 ? out : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const doc = await adminDb().collection("users").doc(user.uid).get();
  const cardThemes = doc.data()?.cardThemes || {};
  return NextResponse.json({ themes: cardThemes });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { cardId, theme } = await req.json();
  if (typeof cardId !== "string" || !/^[a-z0-9_-]{1,40}$/i.test(cardId)) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const cleaned = sanitizeTheme(theme);
  const ref = adminDb().collection("users").doc(user.uid);
  if (cleaned) {
    await ref.set({ cardThemes: { [cardId]: cleaned } }, { merge: true });
  } else {
    await ref.set({ cardThemes: { [cardId]: FieldValue.delete() } }, { merge: true });
  }
  return NextResponse.json({ ok: true, theme: cleaned });
}