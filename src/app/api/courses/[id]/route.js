import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getCourse } from "@/lib/server/courses";
import { canManageScope } from "@/lib/server/hosts";

export async function GET(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const course = await getCourse(id);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (course.status !== "published") {
    const userDoc = await getUserDoc(user.uid);
    const manager = await canManageScope(user.uid, "course", id);
    if (!manager && userDoc?.role !== "owner") {
      return NextResponse.json({ error: "Course not published" }, { status: 404 });
    }
  }
  return NextResponse.json({ course });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const course = await getCourse(id);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (!(await canManageScope(user.uid, "course", id))) {
    return NextResponse.json({ error: "Course host access required" }, { status: 403 });
  }

  const { title, description, status, requiredTier, purchasePriceCents, publicPreview } = await req.json();
  const patch = {};
  if (title !== undefined) patch.title = String(title);
  if (description !== undefined) patch.description = String(description);
  if (publicPreview !== undefined) patch.publicPreview = !!publicPreview;
  if (requiredTier !== undefined) {
    if (!["standard", "premium"].includes(requiredTier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    patch.requiredTier = requiredTier;
  }
  if (purchasePriceCents !== undefined) {
    const price = Number(purchasePriceCents) || 0;
    if (price < 0 || price > 1000000) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    patch.purchasePriceCents = price;
  }
  if (status !== undefined) {
    if (!["draft", "published"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  patch.updatedAt = new Date();
  await adminDb().collection("courses").doc(id).update(patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const course = await getCourse(id);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (!(await canManageScope(user.uid, "course", id))) {
    return NextResponse.json({ error: "Course host access required" }, { status: 403 });
  }

  const modulesSnap = await adminDb().collection("modules").where("courseId", "==", id).get();
  for (const mod of modulesSnap.docs) {
    const lessonsSnap = await adminDb().collection("lessons").where("moduleId", "==", mod.id).get();
    for (const lesson of lessonsSnap.docs) await lesson.ref.delete();
    await mod.ref.delete();
  }
  await adminDb().collection("courses").doc(id).delete();
  return NextResponse.json({ ok: true });
}
