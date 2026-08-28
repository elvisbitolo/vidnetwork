import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { isActiveSub } from "@/lib/server/billing";

export async function GET() {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const snap = await adminDb().collection("users").orderBy("createdAt", "asc").limit(500).get();
  const subSnap = await adminDb().collection("subscriptions").limit(1000).get();
  const subs = new Map(
    subSnap.docs.map((d) => [d.id, d.data()])
  );

  const members = snap.docs.map((d) => {
    const sub = subs.get(d.id) || null;
    const active = isActiveSub(sub);
    return {
      id: d.id,
      name: d.data().name || "",
      email: d.data().email || "",
      role: d.data().role || "member",
      suspended: d.data().suspended || false,
      tier: sub && active ? sub.tier || "lounge" : "",
      subStatus: active ? (sub.status === "trialing" ? "trial" : "active") : sub ? "inactive" : "none",
    };
  });

  return NextResponse.json({ members });
}
