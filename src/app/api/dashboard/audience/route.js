import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getAudienceSeries } from "@/lib/server/dashboard-command";

function clampDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 90;
  return Math.min(365, Math.max(7, Math.round(n)));
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const days = clampDays(req.nextUrl.searchParams.get("days"));
    const data = await getAudienceSeries(days);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to load audience" },
      { status: 500 }
    );
  }
}
