import { NextResponse } from "next/server";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { getUserDoc } from "@/lib/server/auth";
import {
  listHostAssignments,
  setHostAssignment,
  scopeExists,
} from "@/lib/server/hosts";
import { HOST_SCOPE_TYPES, normalizeHostRole } from "@/lib/server/host-core";
import { logAudit } from "@/lib/server/audit";

export async function GET(req) {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const scopeType = searchParams.get("scopeType") || "";
  const scopeId = searchParams.get("scopeId") || "";
  const userId = searchParams.get("userId") || "";

  const assignments = await listHostAssignments(
    scopeType && scopeId ? { scopeType, scopeId } : userId ? { userId } : {}
  );

  return NextResponse.json({ assignments });
}

export async function POST(req) {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { scopeType, scopeId, userId, role } = await req.json();

  if (!HOST_SCOPE_TYPES.includes(scopeType) || !scopeId || !userId) {
    return NextResponse.json({ error: "Scope, target, and member are required" }, { status: 400 });
  }
  const normalizedRole = normalizeHostRole(role);
  if (!normalizedRole) {
    return NextResponse.json({ error: "Role must be host or co-host" }, { status: 400 });
  }
  if (!(await scopeExists(scopeType, scopeId))) {
    return NextResponse.json({ error: "Scope not found" }, { status: 404 });
  }
  const member = await getUserDoc(userId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const result = await setHostAssignment({
    scopeType,
    scopeId,
    userId,
    role: normalizedRole,
    grantedBy: auth.user.uid,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "host.assigned",
    targetId: result.id,
    metadata: { scopeType, scopeId, userId, role: normalizedRole },
  });

  return NextResponse.json({ ok: true, id: result.id });
}
