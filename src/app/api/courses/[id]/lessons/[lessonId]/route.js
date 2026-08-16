import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { canManageScope } from "@/lib/server/hosts";

export async function DELETE(req, { params }) {
  const { id, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await canManageScope(user.uid, "course", id))) {
    return NextResponse.json({ error: "Course host access required" }, { status: 403 });
  }

  const lessonRef = adminDb().collection("lessons").doc(lessonId);
  const lessonSnap = await lessonRef.get();
  if (!lessonSnap.exists || lessonSnap.data().courseId !== id) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  await lessonRef.delete();
  return NextResponse.json({ ok: true });
}
