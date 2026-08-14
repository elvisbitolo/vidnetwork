import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listCourses } from "@/lib/server/courses";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";
import { getSpace } from "@/lib/server/spaces";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;
  const courses = await listCourses(auth.userDoc?.role === "owner");
  return NextResponse.json({ courses });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { title, description = "", status = "draft", spaceId = "", purchasePriceCents = 0 } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Course title required" }, { status: 400 });
  }
  if (!["draft", "published"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const price = Number(purchasePriceCents) || 0;
  if (price < 0 || price > 1000000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }
  if (spaceId) {
    const space = await getSpace(spaceId);
    if (!space || space.status !== "active") {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }
  }

  const ref = await adminDb().collection("courses").add({
    title,
    description,
    status,
    spaceId: spaceId || "",
    purchasePriceCents: price,
    createdBy: auth.user.uid,
    createdAt: new Date(),
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "course.created",
    targetId: ref.id,
    metadata: { title, status, spaceId, purchasePriceCents: price },
  });

  return NextResponse.json({ id: ref.id });
}
