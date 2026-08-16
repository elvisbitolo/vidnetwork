import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getDashboardCommandData } from "@/lib/server/dashboard-command";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);

  try {
    const data = await getDashboardCommandData(user.uid, userDoc || {});
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
