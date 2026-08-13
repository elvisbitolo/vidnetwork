import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getProgress } from "@/lib/server/courses";

export async function POST(req, { params }) {
  const { id: courseId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { lessonId, completed } = await req.json();
  if (!lessonId || typeof lessonId !== "string") {
    return NextResponse.json({ error: "Lesson required" }, { status: 400 });
  }

  const lessonSnap = await adminDb().collection("lessons").doc(lessonId).get();
  if (!lessonSnap.exists || lessonSnap.data().courseId !== courseId) {
    return NextResponse.json({ error: "Lesson not found in this course" }, { status: 404 });
  }

  const ref = adminDb().collection("progress").doc(`${courseId}_${user.uid}`);
  const progress = await getProgress(courseId, user.uid);
  const completedLessons = new Set(progress.completedLessons || []);
  if (completed) {
    completedLessons.add(lessonId);
  } else {
    completedLessons.delete(lessonId);
  }
  await ref.set({
    courseId,
    userId: user.uid,
    completedLessons: [...completedLessons],
    updatedAt: new Date(),
  });

  return NextResponse.json({ completedLessons: [...completedLessons] });
}
