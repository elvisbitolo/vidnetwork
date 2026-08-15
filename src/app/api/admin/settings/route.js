import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { getSettings, updateSettings } from "@/lib/server/settings";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  const updated = await updateSettings({
    welcomeChecklist: body.welcomeChecklist,
  });
  return NextResponse.json(updated);
}
