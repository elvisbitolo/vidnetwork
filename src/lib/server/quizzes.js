import { adminDb } from "@/lib/firebase/admin";
import { validateQuizQuestions } from "@/lib/server/quizzes-core";

export { validateQuizQuestions };

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function createQuiz({ lessonId, moduleId, courseId, questions, passingScore, createdBy }) {
  const validated = validateQuizQuestions(questions);
  if (!validated.ok) {
    throw Object.assign(new Error(validated.error), { code: 400 });
  }
  const score = Number(passingScore);
  const passing = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 70;

  const ref = adminDb().collection("quizzes").doc();
  await ref.set({
    lessonId,
    moduleId,
    courseId,
    questions: validated.questions,
    passingScore: passing,
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id };
}

export async function getQuizByLesson(lessonId) {
  const snap = await adminDb().collection("quizzes").where("lessonId", "==", lessonId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getQuiz(quizId) {
  const doc = await adminDb().collection("quizzes").doc(quizId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function deleteQuiz(quizId) {
  await adminDb().collection("quizzes").doc(quizId).delete();
}

export async function updateQuiz(quizId, data) {
  const ref = adminDb().collection("quizzes").doc(quizId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const patch = { updatedAt: new Date() };
  if (data.questions !== undefined) {
    const validated = validateQuizQuestions(data.questions);
    if (!validated.ok) {
      throw Object.assign(new Error(validated.error), { code: 400 });
    }
    patch.questions = validated.questions;
  }
  if (data.passingScore !== undefined) {
    const score = Number(data.passingScore);
    patch.passingScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 70;
  }
  await ref.update(patch);
  return { id: quizId };
}

function normalizeAnswer(value, total) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < total ? n : -1;
}

export async function submitQuiz({ userId, userName, quizId, answers }) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    throw Object.assign(new Error("Quiz not found"), { code: 404 });
  }
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    throw Object.assign(new Error("Answers must match the question count"), { code: 400 });
  }

  let score = 0;
  const answerDetails = quiz.questions.map((question, i) => {
    const selected = normalizeAnswer(answers[i], question.options.length);
    const correct = question.correctIndex;
    const isCorrect = selected === correct;
    if (isCorrect) score += 1;
    return { selected, correct: isCorrect };
  });

  const total = quiz.questions.length;
  const percentage = total ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= (quiz.passingScore ?? 70);

  const docData = {
    userId,
    userName: userName || "",
    quizId,
    courseId: quiz.courseId,
    lessonId: quiz.lessonId,
    score,
    total,
    percentage,
    passed,
    answers: answerDetails,
    completedAt: new Date(),
  };
  await adminDb().collection("quizResults").add(docData);

  return { score, total, percentage, passed };
}

export async function getQuizResult(quizId, userId) {
  const snap = await adminDb()
    .collection("quizResults")
    .where("quizId", "==", quizId)
    .where("userId", "==", userId)
    .orderBy("completedAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    completedAt: toMillis(doc.data().completedAt),
  };
}

export async function getQuizResults(courseId, userId) {
  const snap = await adminDb()
    .collection("quizResults")
    .where("courseId", "==", courseId)
    .where("userId", "==", userId)
    .orderBy("completedAt", "desc")
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      completedAt: toMillis(data.completedAt),
    };
  });
}
