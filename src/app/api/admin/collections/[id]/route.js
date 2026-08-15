import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { updateCollection, deleteCollection } from "@/lib/server/collections";

export async function PATCH(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  const updated = await updateCollection(params.id, {
    name: body.name,
    description: body.description,
    spaceIds: body.spaceIds,
  });
  if (!updated) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  await deleteCollection(params.id);
  return NextResponse.json({ ok: true });
}
