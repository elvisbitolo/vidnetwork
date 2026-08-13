import { adminDb } from "@/lib/firebase/admin";

export async function getSubscription(uid) {
  const doc = await adminDb().collection("subscriptions").doc(uid).get();
  return doc.exists ? doc.data() : null;
}

export function isActiveSub(sub) {
  if (!sub || !["active", "trialing"].includes(sub.status)) return false;
  const toMillis = (v) =>
    v && typeof v.toMillis === "function" ? v.toMillis() : Number(v || 0);
  const end = toMillis(sub.currentPeriodEnd) || toMillis(sub.trialEnd);
  return end > Date.now();
}

export async function getTier(uid) {
  const sub = await getSubscription(uid);
  if (!isActiveSub(sub)) return null;
  return sub.tier || "standard";
}
