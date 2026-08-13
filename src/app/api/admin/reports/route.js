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

  const snap = await adminDb()
    .collection("reports")
    .where("status", "==", "open")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const reports = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : d.data().createdAt,
  }));

  return NextResponse.json({ reports });
}
