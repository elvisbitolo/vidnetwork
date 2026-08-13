import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCourse, getProgress } from "@/lib/server/courses";
import { requireActiveMember, guardJson } from "@/lib/server/authorize";

export async function POST(req, { params }) {
  const { id: courseId } = await params;
  const course = await getCourse(courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const auth = await requireActiveMember({ tier: course.requiredTier });
  const denied = guardJson(auth);
  if (denied) return denied;

  const { lessonId, completed } = await req.json();
  if (!lessonId || typeof lessonId !== "string") {
    return NextResponse.json({ error: "Lesson required" }, { status: 400 });
  }

  const lessonSnap = await adminDb().collection("lessons").doc(lessonId).get();
  if (!lessonSnap.exists || lessonSnap.data().courseId !== courseId) {
    return NextResponse.json({ error: "Lesson not found in this course" }, { status: 404 });
  }

  const ref = adminDb().collection("progress").doc(`${courseId}_${auth.user.uid}`);
  const progress = await getProgress(courseId, auth.user.uid);
  const completedLessons = new Set(progress.completedLessons || []);
  if (completed) {
    completedLessons.add(lessonId);
  } else {
    completedLessons.delete(lessonId);
  }
  await ref.set({
    courseId,
    userId: auth.user.uid,
    completedLessons: [...completedLessons],
    updatedAt: new Date(),
  });

  return NextResponse.json({ completedLessons: [...completedLessons] });
}
