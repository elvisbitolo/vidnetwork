import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { recordDailyVisit, awardBadge } from "@/lib/server/gamification";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const userDoc = await getUserDoc(user.uid);
  const name = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";
  await recordDailyVisit(user.uid, name);
  await awardBadge(user.uid, "welcome", name);

  return NextResponse.json({ ok: true });
}
