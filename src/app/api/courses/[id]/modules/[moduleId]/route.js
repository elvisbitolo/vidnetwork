import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { canManageScope } from "@/lib/server/hosts";

export async function DELETE(req, { params }) {
  const { id, moduleId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await canManageScope(user.uid, "course", id))) {
    return NextResponse.json({ error: "Course host access required" }, { status: 403 });
  }

  const moduleRef = adminDb().collection("modules").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  if (!moduleSnap.exists || moduleSnap.data().courseId !== id) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const lessonsSnap = await adminDb().collection("lessons").where("moduleId", "==", moduleId).get();
  for (const lesson of lessonsSnap.docs) await lesson.ref.delete();
  await moduleRef.delete();
  return NextResponse.json({ ok: true });
}
