import { adminDb } from "@/lib/firebase/admin";
import { getSpaceBySlug } from "@/lib/server/spaces";
import { computeNextRun, normalizeSchedule } from "@/lib/server/questions-core";

export { computeNextRun, normalizeSchedule };

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function createQuestion({ text, freq, hour, minute, weekday, dayOfMonth, spaceSlug = "", createdBy }) {
  const clean = typeof text === "string" ? text.trim() : "";
  if (!clean) {
    throw Object.assign(new Error("Question text required"), { code: 400 });
  }
  const schedule = normalizeSchedule({ freq, hour, minute, weekday, dayOfMonth });

  let space = null;
  if (spaceSlug) {
    space = await getSpaceBySlug(spaceSlug);
  }

  const ref = adminDb().collection("questions").doc();
  const nextRun = computeNextRun(schedule, Date.now());
  await ref.set({
    text: clean,
    ...schedule,
    spaceId: space?.id || "",
    spaceSlug: space?.slug || "",
    spaceName: space?.name || "",
    active: true,
    nextRun: nextRun ? new Date(nextRun) : null,
    lastPostedAt: null,
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id };
}

export async function listQuestions() {
  const snap = await adminDb().collection("questions").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      nextRun: toMillis(data.nextRun),
      lastPostedAt: toMillis(data.lastPostedAt),
      createdAt: toMillis(data.createdAt),
    };
  });
}

export async function getQuestion(id) {
  const doc = await adminDb().collection("questions").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function updateQuestionActive(id, active) {
  const ref = adminDb().collection("questions").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = doc.data();
  const schedule = normalizeSchedule(data);
  await ref.update({
    active: !!active,
    nextRun: active ? new Date(computeNextRun(schedule, Date.now())) : data.nextRun || null,
  });
  return { id };
}

export async function deleteQuestion(id) {
  await adminDb().collection("questions").doc(id).delete();
}

export async function listDueQuestions(now = Date.now()) {
  const snap = await adminDb().collection("questions").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((question) => {
      if (question.active !== true) return false;
      const next = toMillis(question.nextRun);
      return next !== null && next <= now;
    });
}

export async function postScheduledQuestion(question, now = new Date()) {
  const data = {
    authorId: "system",
    authorName: "Secret Yarnery",
    text: question.text,
    likes: {},
    pinned: false,
    kind: "question",
    hashtags: [],
    bookmarks: {},
    commentCount: 0,
    lastActivityAt: now,
    isScheduled: true,
    questionId: question.id,
    createdAt: now,
  };
  if (question.spaceId) {
    data.spaceId = question.spaceId;
  }
  const ref = await adminDb().collection("posts").add(data);
  return ref.id;
}

export async function advanceQuestion(question, now = Date.now()) {
  const ref = adminDb().collection("questions").doc(question.id);
  const schedule = normalizeSchedule(question);
  const nextRun = computeNextRun(schedule, now);
  const expected = toMillis(question.nextRun);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = toMillis(snap.data().nextRun);
    if (current !== expected) return;
    tx.update(ref, {
      lastPostedAt: new Date(now),
      nextRun: nextRun ? new Date(nextRun) : null,
    });
  });
}
