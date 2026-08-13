import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { subscription } = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await adminDb()
    .collection("pushSubscriptions")
    .doc(user.uid)
    .set({
      userId: user.uid,
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      updatedAt: new Date(),
    });

  return NextResponse.json({ ok: true });
}
