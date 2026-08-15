import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { getIncomeData } from "@/lib/server/analytics";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;
  const income = await getIncomeData();
  return NextResponse.json({ income });
}
