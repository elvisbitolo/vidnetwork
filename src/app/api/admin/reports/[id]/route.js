import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";
import { logError } from "@/lib/server/log";

export async function POST(req, { params }) {
  const { id } = await params;
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

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
    await targetRef.delete().catch((err) => {
      logError("moderation.content_delete_failed", {
        reportId: id,
        targetPath: report.targetPath || report.type,
        targetId: report.targetId,
        error: err.message,
      });
    });
  }

  await ref.update({
    status: action === "dismiss" ? "dismissed" : "resolved",
    handledBy: auth.user.uid,
    handledAt: new Date(),
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: action === "dismiss" ? "moderation.report_dismissed" : "moderation.content_removed",
    targetId: id,
    metadata: { type: snap.data().type, targetPath: snap.data().targetPath },
  });

  return NextResponse.json({ ok: true });
}
