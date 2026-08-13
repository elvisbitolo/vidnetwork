import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc, canModerate } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (!canModerate(userDoc)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
