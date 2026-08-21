import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { createRecognition } from "@/lib/server/recognition";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/log";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const staff = (await getUserDoc(user.uid))?.role;
  if (staff !== "owner" && staff !== "moderator") {
    const sub = await getAccessSub(user.uid);
    if (!isActiveSub(sub)) {
      return NextResponse.json({ error: "Active membership required" }, { status: 403 });
    }
  }

  const limited = rateLimitGuard(`recognition:${user.uid}`, { limit: 5 });
  if (limited) return limited;

  const { toUid, value, note = "" } = await req.json();
  const userDoc = await getUserDoc(user.uid);
  const fromName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";

  for (let attempt = 0; attempt < 2; attempt++) {
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
      logError("recognition.failed", { error: err.message, fromUid: user.uid, toUid, value, attempt });
      if (attempt === 0 && (err.code === 500 || !err.code)) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      const status = err.code || 500;
      return NextResponse.json(
        { error: status === 500 ? "Something went wrong. Please try again." : err.message },
        { status }
      );
    }
  }
}
