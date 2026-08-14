import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeProfile } from "@/lib/server/profile";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  return NextResponse.json({
    uid: user.uid,
    name: userDoc?.name || user.name || user.displayName || "",
    email: user.email,
    role: userDoc?.role || "member",
  });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { patch, errors } = normalizeProfile(body || {});

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: Object.values(errors)[0], errors }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const ref = adminDb().collection("users").doc(user.uid);
  const doc = await ref.get();
  if (doc.exists) {
    await ref.update(patch);
  } else {
    await ref.set({ ...patch, role: "member", createdAt: new Date() });
  }

  return NextResponse.json({ ok: true, ...patch });
}
