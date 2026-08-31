import { NextResponse } from "next/server";
import { requireActiveMember, guardJson } from "@/lib/server/authorize";
import { getPurchasedKeys } from "@/lib/server/purchases";

export async function GET() {
  const auth = await requireActiveMember();
  const denied = guardJson(auth);
  if (denied) return denied;

  const keys = await getPurchasedKeys(auth.user.uid);
  return NextResponse.json({ keys: Array.from(keys) });
}