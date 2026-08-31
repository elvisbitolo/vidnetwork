import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { getRetentionAnalytics } from "@/lib/server/analytics";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const data = await getRetentionAnalytics();
  return NextResponse.json({ retention: data });
}
