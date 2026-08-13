import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function DELETE(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const membersSnap = await adminDb().collection("groupMembers").where("groupId", "==", id).get();
  for (const member of membersSnap.docs) await member.ref.delete();
  await adminDb().collection("groups").doc(id).delete();
  return NextResponse.json({ ok: true });
}
