import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { getUserDoc } from "@/lib/server/auth";
import { getQuiz, submitQuiz } from "@/lib/server/quizzes";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function POST(req, { params }) {
  const { quizId } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const limited = rateLimitGuard(`quiz:submit:${auth.user.uid}:${quizId}`, { limit: 10 });
  if (limited) return limited;

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { answers } = await req.json();
  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: "Answers are required" }, { status: 400 });
  }

  const userDoc = await getUserDoc(auth.user.uid);
  const result = await submitQuiz({
    userId: auth.user.uid,
    userName: userDoc?.name || auth.user.name || "Member",
    quizId,
    answers,
  });

  const correctAnswers = quiz.questions.map((q) => q.correctIndex);

  return NextResponse.json({ ...result, correctAnswers });
}
