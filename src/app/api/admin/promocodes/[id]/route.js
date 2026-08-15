import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { updatePromo, deletePromo } from "@/lib/server/promocodes";

export async function PATCH(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  const updated = await updatePromo(params.id, body);
  if (!updated) {
    return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  await deletePromo(params.id);
  return NextResponse.json({ ok: true });
}
