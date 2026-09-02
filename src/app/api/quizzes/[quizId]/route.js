import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { getUserDoc } from "@/lib/server/auth";
import { getCourse } from "@/lib/server/courses";
import { canManageScope } from "@/lib/server/hosts";
import { getAccessSub, isActiveSub, isStaff } from "@/lib/server/subscription";
import { getQuiz, updateQuiz, deleteQuiz } from "@/lib/server/quizzes";
import { logAudit } from "@/lib/server/audit";
import { httpStatusFor } from "@/lib/server/http-errors";

async function canReadQuiz(user, userDoc, quiz) {
  if (quiz.createdBy === user.uid) return true;
  if (isStaff(userDoc)) return true;
  if (await canManageScope(user.uid, "course", quiz.courseId)) return true;
  const course = await getCourse(quiz.courseId);
  if (!course || course.status !== "published") return false;
  const sub = await getAccessSub(user.uid);
  return isActiveSub(sub);
}

export async function GET(req, { params }) {
  const { quizId } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  if (!(await canReadQuiz(auth.user.uid, auth.userDoc, quiz))) {
    return NextResponse.json({ error: "Enrolled in the course to view this quiz" }, { status: 403 });
  }

  return NextResponse.json({ quiz });
}

export async function PUT(req, { params }) {
  const { quizId } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const isCreator = quiz.createdBy === auth.user.uid;
  if (
    !isCreator &&
    !(auth.userDoc?.role === "owner" || auth.userDoc?.role === "moderator") &&
    !(await canManageScope(auth.user.uid, "course", quiz.courseId))
  ) {
    return NextResponse.json({ error: "Quiz host access required" }, { status: 403 });
  }

  const { questions, passingScore } = await req.json();
  try {
    await updateQuiz(quizId, { questions, passingScore });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update quiz" },
      { status: httpStatusFor(err) }
    );
  }

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "quiz.updated",
    metadata: { quizId, courseId: quiz.courseId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { quizId } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const isCreator = quiz.createdBy === auth.user.uid;
  if (
    !isCreator &&
    !(auth.userDoc?.role === "owner" || auth.userDoc?.role === "moderator") &&
    !(await canManageScope(auth.user.uid, "course", quiz.courseId))
  ) {
    return NextResponse.json({ error: "Quiz host access required" }, { status: 403 });
  }

  await deleteQuiz(quizId);

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "quiz.deleted",
    metadata: { quizId, courseId: quiz.courseId },
  });

  return NextResponse.json({ ok: true });
}
