import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { createAutomation, listAutomations } from "@/lib/server/automations";
import { normalizeAutomation } from "@/lib/server/automations-core";
import { httpStatusFor } from "@/lib/server/http-errors";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;
  const automations = await listAutomations();
  return NextResponse.json({ automations });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  const normalized = normalizeAutomation(body);
  if (!normalized.name) {
    return NextResponse.json({ error: "Automation name required" }, { status: 400 });
  }
  if (!normalized.trigger) {
    return NextResponse.json({ error: "Choose a trigger" }, { status: 400 });
  }
  if (!normalized.action) {
    return NextResponse.json({ error: "Choose an action" }, { status: 400 });
  }

  try {
    const result = await createAutomation({ ...normalized, createdBy: auth.user.uid });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = httpStatusFor(err);
    return NextResponse.json(
      { error: status === 400 ? err.message : "Could not create automation" },
      { status }
    );
  }
}
