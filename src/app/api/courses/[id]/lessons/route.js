import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getModules } from "@/lib/server/courses";

export async function POST(req, { params }) {
  const { id: courseId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { moduleId, title, body = "", kind = "text", videoUrl = "", releaseAt = "" } = await req.json();
  if (!moduleId || !title || typeof title !== "string") {
    return NextResponse.json({ error: "Lesson title and module required" }, { status: 400 });
  }

  const moduleSnap = await adminDb().collection("modules").doc(moduleId).get();
  if (!moduleSnap.exists || moduleSnap.data().courseId !== courseId) {
    return NextResponse.json({ error: "Module not found in this course" }, { status: 404 });
  }

  const existing = await getModules(courseId);
  let position = 1;
  for (const mod of existing) {
    if (mod.id === moduleId) {
      const lessonsSnap = await adminDb().collection("lessons").where("moduleId", "==", moduleId).get();
      position = lessonsSnap.docs.length ? Math.max(...lessonsSnap.docs.map((d) => d.data().position)) + 1 : 1;
      break;
    }
  }

  const lessonKind = kind === "video" ? "video" : "text";
  const data = {
    courseId,
    moduleId,
    title,
    body: body || "",
    kind: lessonKind,
    position,
    createdAt: new Date(),
  };
  if (lessonKind === "video") {
    data.videoUrl = videoUrl || "";
  }
  if (releaseAt) {
    const parsed = Date.parse(releaseAt);
    if (Number.isFinite(parsed)) data.releaseAt = new Date(parsed);
  }

  const ref = await adminDb().collection("lessons").add(data);
  return NextResponse.json({ id: ref.id });
}
