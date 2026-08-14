import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { deleteWhere, deletePostWithComments } from "@/lib/server/delete";
import { deleteRoom } from "@/lib/server/rooms";

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

  const roomsSnap = await adminDb().collection("rooms").where("groupId", "==", id).get();
  for (const doc of roomsSnap.docs) {
    await deleteRoom({ id: doc.id, ...doc.data() });
  }

  const postsSnap = await adminDb().collection("posts").where("groupId", "==", id).get();
  for (const doc of postsSnap.docs) {
    await deletePostWithComments(doc.ref);
  }

  await deleteWhere("groupMembers", "groupId", id);
  await adminDb().collection("groups").doc(id).delete();
  return NextResponse.json({ ok: true });
}
