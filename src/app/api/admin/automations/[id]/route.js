import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { deleteAutomation, setAutomationActive } from "@/lib/server/automations";

export async function PATCH(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { id } = await params;
  const { active } = await req.json();
  const result = await setAutomationActive(id, active);
  if (!result) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { id } = await params;
  await deleteAutomation(id);
  return NextResponse.json({ ok: true });
}
