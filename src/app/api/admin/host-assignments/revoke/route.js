import { NextResponse } from "next/server";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { removeHostAssignment } from "@/lib/server/hosts";
import { logAudit } from "@/lib/server/audit";

export async function DELETE(req) {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const scopeType = searchParams.get("scopeType") || "";
  const scopeId = searchParams.get("scopeId") || "";
  const userId = searchParams.get("userId") || "";
  if (!scopeType || !scopeId || !userId) {
    return NextResponse.json({ error: "Invalid assignment" }, { status: 400 });
  }

  const result = await removeHostAssignment(scopeType, scopeId, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "host.revoked",
    targetId: `${scopeType}_${scopeId}_${userId}`,
    metadata: { scopeType, scopeId, userId },
  });

  return NextResponse.json({ ok: true });
}
