import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { createRecognition } from "@/lib/server/recognition";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/log";

export const dynamic = "force-dynamic";

function isTransient(err) {
  const code = String(err?.code || "");
  return code === "" || code.includes("unavailable") || code.includes("deadline-exceeded");
}

function httpStatusFor(err) {
  if (typeof err?.code === "number" && Number.isInteger(err.code)) return err.code;
  const code = String(err?.code || "");
  if (code.includes("not-found")) return 404;
  if (code.includes("already-exists")) return 409;
  if (code.includes("permission-denied") || code.includes("aborted")) return 403;
  if (code.includes("unauthenticated")) return 401;
  if (code.includes("resource-exhausted")) return 429;
  return 500;
}

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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { toUid, value, note = "" } = body;
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
      logError("recognition.failed", {
        error: err.message,
        code: err?.code || null,
        stack: err?.stack,
        fromUid: user.uid,
        toUid,
        value,
        attempt,
      });
      if (attempt === 0 && isTransient(err)) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      const status = httpStatusFor(err);
      return NextResponse.json(
        { error: status === 500 ? "Something went wrong. Please try again." : err.message },
        { status }
      );
    }
  }
}
