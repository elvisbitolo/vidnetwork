import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { createQuestion, listQuestions } from "@/lib/server/questions";
import { httpStatusFor } from "@/lib/server/http-errors";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;
  const questions = await listQuestions();
  return NextResponse.json({ questions });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  try {
    const result = await createQuestion({
      ...body,
      createdBy: auth.user.uid,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = httpStatusFor(err);
    return NextResponse.json(
      { error: status === 400 ? err.message : "Could not create question" },
      { status }
    );
  }
}
