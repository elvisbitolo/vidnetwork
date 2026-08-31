export const QUIZ_MAX_QUESTIONS = 20;
export const QUIZ_MAX_OPTIONS = 4;
export const QUIZ_MIN_OPTIONS = 2;
export const QUIZ_QUESTION_MAX = 500;
export const QUIZ_OPTION_MAX = 200;

export function validateQuizQuestions(questions) {
  if (!Array.isArray(questions)) {
    return { ok: false, error: "Questions must be an array" };
  }
  if (questions.length === 0) {
    return { ok: false, error: "Quiz must have at least one question" };
  }
  if (questions.length > QUIZ_MAX_QUESTIONS) {
    return { ok: false, error: `Quiz can have at most ${QUIZ_MAX_QUESTIONS} questions` };
  }

  const clean = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const questionText = typeof q?.question === "string" ? q.question.trim() : "";
    if (!questionText) {
      return { ok: false, error: `Question ${i + 1} text is required` };
    }
    if (questionText.length > QUIZ_QUESTION_MAX) {
      return { ok: false, error: `Question ${i + 1} is too long (max ${QUIZ_QUESTION_MAX} chars)` };
    }

    if (!Array.isArray(q?.options)) {
      return { ok: false, error: `Question ${i + 1} must have options` };
    }
    if (
      q.options.length < QUIZ_MIN_OPTIONS ||
      q.options.length > QUIZ_MAX_OPTIONS
    ) {
      return {
        ok: false,
        error: `Question ${i + 1} must have ${QUIZ_MIN_OPTIONS}-${QUIZ_MAX_OPTIONS} options`,
      };
    }

    const options = q.options.map((o) => (typeof o === "string" ? o.trim() : ""));
    if (options.some((o) => !o)) {
      return { ok: false, error: `Question ${i + 1} has an empty option` };
    }
    if (options.some((o) => o.length > QUIZ_OPTION_MAX)) {
      return { ok: false, error: `Question ${i + 1} option is too long (max ${QUIZ_OPTION_MAX} chars)` };
    }
    if (new Set(options).size !== options.length) {
      return { ok: false, error: `Question ${i + 1} has duplicate options` };
    }

    const correctIndex = Number(q?.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return { ok: false, error: `Question ${i + 1} has an invalid correct answer` };
    }

    const explanation = typeof q?.explanation === "string" ? q.explanation.trim() : "";
    clean.push({
      question: questionText,
      options,
      correctIndex,
      explanation: explanation ? explanation.slice(0, QUIZ_QUESTION_MAX) : "",
    });
  }

  return { ok: true, questions: clean };
}
