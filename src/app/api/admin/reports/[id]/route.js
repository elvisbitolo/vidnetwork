import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc, canModerate } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (!canModerate(userDoc)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = await req.json();
  if (!["dismiss", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const ref = adminDb().collection("reports").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (snap.data().status !== "open") {
    return NextResponse.json({ error: "Report already handled" }, { status: 400 });
  }

  if (action === "delete") {
    const report = snap.data();
    const targetRef = report.targetPath
      ? adminDb().doc(report.targetPath)
      : report.type === "member"
        ? adminDb().collection("users").doc(report.targetId)
        : adminDb().collection("posts").doc(report.targetId);
    await targetRef.delete().catch(() => {});
  }

  await ref.update({
    status: action === "dismiss" ? "dismissed" : "resolved",
    handledBy: user.uid,
    handledAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
