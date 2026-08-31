import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSidebarData } from "@/lib/server/sidebar";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "day";
  if (!["day", "week", "month"].includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const data = await getSidebarData(user.uid, period);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to load" },
      { status: 500 }
    );
  }
}