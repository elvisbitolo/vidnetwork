import { adminDb } from "@/lib/firebase/admin";
import { meetsTier } from "@/lib/server/plans";

export function canAccessCourse(course, tier) {
  return meetsTier(tier, course?.requiredTier);
}

export async function listCourses(includeDrafts = false) {
  const snap = await adminDb().collection("courses").orderBy("createdAt", "desc").get();
  const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return includeDrafts ? docs : docs.filter((course) => course.status === "published");
}

export async function getCourse(id) {
  const doc = await adminDb().collection("courses").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getModules(courseId) {
  const snap = await adminDb().collection("modules").where("courseId", "==", courseId).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

export async function getLessons(moduleId) {
  const snap = await adminDb().collection("lessons").where("moduleId", "==", moduleId).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

export async function getCourseFull(id) {
  const course = await getCourse(id);
  if (!course) return null;
  const modules = await getModules(id);
  const lessons = {};
  for (const mod of modules) {
    lessons[mod.id] = await getLessons(mod.id);
  }
  return { course, modules, lessons };
}

export async function getLesson(id) {
  const doc = await adminDb().collection("lessons").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getProgress(courseId, uid) {
  const doc = await adminDb()
    .collection("progress")
    .doc(`${courseId}_${uid}`)
    .get();
  return doc.exists ? doc.data() : { completedLessons: [] };
}

export async function getNextLessonId(courseId, lesson) {
  const modules = await getModules(courseId);
  const all = [];
  for (const mod of modules) {
    const list = await getLessons(mod.id);
    all.push(...list);
  }
  const index = all.findIndex((l) => l.id === lesson.id);
  return index >= 0 && index < all.length - 1 ? all[index + 1].id : null;
}
