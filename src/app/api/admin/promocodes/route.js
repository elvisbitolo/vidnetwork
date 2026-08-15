import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { listPromos, createPromo } from "@/lib/server/promocodes";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;
  const promos = await listPromos();
  return NextResponse.json({ promos });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  try {
    const result = await createPromo({
      code: body.code,
      percentOff: body.percentOff,
      amountOffCents: body.amountOffCents,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt,
      active: body.active,
      createdBy: auth.user.uid,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err.code || 500;
    return NextResponse.json(
      { error: status === 500 ? "Could not create promo code" : err.message },
      { status }
    );
  }
}
