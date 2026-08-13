import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { listCourses } from "@/lib/server/courses";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  const courses = await listCourses(userDoc?.role === "owner");
  return NextResponse.json({ courses });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description = "", status = "draft" } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Course title required" }, { status: 400 });
  }
  if (!["draft", "published"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ref = await adminDb().collection("courses").add({
    title,
    description,
    status,
    createdBy: user.uid,
    createdAt: new Date(),
  });
  return NextResponse.json({ id: ref.id });
}
