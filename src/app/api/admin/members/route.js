import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireModerator, guardJson } from "@/lib/server/authorize";

export async function GET() {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const snap = await adminDb().collection("users").orderBy("createdAt", "asc").limit(500).get();
  const members = snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name || "",
    email: d.data().email || "",
    role: d.data().role || "member",
    suspended: d.data().suspended || false,
  }));

  return NextResponse.json({ members });
}
