import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { role, suspended } = await req.json();
  const ref = adminDb().collection("users").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const update = {};
  if (role !== undefined) {
    if (!["member", "moderator"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (auth.userDoc.role !== "owner") {
      return NextResponse.json({ error: "Only the owner can change roles" }, { status: 403 });
    }
    if (snap.data().role === "owner") {
      return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 400 });
    }
    update.role = role;
  }
  if (suspended !== undefined) {
    update.suspended = Boolean(suspended);
  }

  await ref.update(update);

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: role !== undefined ? "member.role_changed" : "member.suspended",
    targetId: id,
    metadata: { role, suspended, prevRole: snap.data().role },
  });

  return NextResponse.json({ ok: true });
}
