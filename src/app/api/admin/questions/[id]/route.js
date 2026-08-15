import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { deleteQuestion, updateQuestionActive } from "@/lib/server/questions";

export async function PATCH(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { id } = await params;
  const { active } = await req.json();
  const result = await updateQuestionActive(id, active);
  if (!result) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { id } = await params;
  await deleteQuestion(id);
  return NextResponse.json({ ok: true });
}
