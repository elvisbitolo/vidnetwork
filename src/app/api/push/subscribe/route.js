import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { logError } from "@/lib/server/log";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { subscription } = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    await adminDb()
      .collection("pushSubscriptions")
      .doc(user.uid)
      .set({
        userId: user.uid,
        endpoint: subscription.endpoint,
        keys: subscription.keys || {},
        updatedAt: new Date(),
      });
  } catch (err) {
    logError("push.subscribe_failed", { error: err.message, uid: user.uid });
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
