import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getGamification } from "@/lib/server/gamification";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const userDoc = await getUserDoc(user.uid);
  const name = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";
  const stats = await getGamification(user.uid, name);

  return NextResponse.json({ stats });
}
