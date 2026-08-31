import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { getRevenueAnalytics } from "@/lib/server/analytics";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const data = await getRevenueAnalytics();
  return NextResponse.json({ revenue: data });
}
