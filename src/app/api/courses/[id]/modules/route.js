import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getCourse, getModules } from "@/lib/server/courses";
import { canManageScope } from "@/lib/server/hosts";

export async function GET(req, { params }) {
  const { id: courseId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await canManageScope(user.uid, "course", courseId))) {
    return NextResponse.json({ error: "Course host access required" }, { status: 403 });
  }
  const modules = await getModules(courseId);
  const lessons = {};
  for (const mod of modules) {
    const snap = await adminDb()
      .collection("lessons")
      .where("moduleId", "==", mod.id)
      .get();
    lessons[mod.id] = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  }
  return NextResponse.json({ modules, lessons });
}

export async function POST(req, { params }) {
  const { id: courseId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const course = await getCourse(courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (!(await canManageScope(user.uid, "course", courseId))) {
    return NextResponse.json({ error: "Course host access required" }, { status: 403 });
  }

  const { title } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Module title required" }, { status: 400 });
  }

  const existing = await getModules(courseId);
  const position = existing.length ? Math.max(...existing.map((m) => m.position)) + 1 : 1;
  const ref = await adminDb().collection("modules").add({
    courseId,
    title,
    position,
    createdAt: new Date(),
  });
  return NextResponse.json({ id: ref.id });
}
