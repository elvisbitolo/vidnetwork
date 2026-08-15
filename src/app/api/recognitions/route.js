import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { createRecognition } from "@/lib/server/recognition";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const limited = rateLimitGuard(`recognition:${user.uid}`, { limit: 5 });
  if (limited) return limited;

  const { toUid, value, note = "" } = await req.json();
  const userDoc = await getUserDoc(user.uid);
  const fromName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";

  try {
    const result = await createRecognition({
      fromUid: user.uid,
      fromName,
      toUid,
      value,
      note,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err.code || 500;
    return NextResponse.json(
      { error: status === 500 ? "Recognition failed" : err.message },
      { status }
    );
  }
}
