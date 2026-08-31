import { NextResponse } from "next/server";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { listAutomationRuns, getAutomationStats } from "@/lib/server/automation-history";

export async function GET(req, { params }) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit")) || 25;

  const [runs, stats] = await Promise.all([
    listAutomationRuns(id, limit),
    getAutomationStats(id),
  ]);

  return NextResponse.json({ runs, stats });
}
