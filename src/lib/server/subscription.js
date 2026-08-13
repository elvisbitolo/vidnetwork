import { adminDb } from "@/lib/firebase/admin";
import { isActiveSub as isActiveSubLogic } from "@/lib/server/billing";

export async function getSubscription(uid) {
  const doc = await adminDb().collection("subscriptions").doc(uid).get();
  return doc.exists ? doc.data() : null;
}

export function isActiveSub(sub) {
  return isActiveSubLogic(sub);
}

export async function getTier(uid) {
  const sub = await getSubscription(uid);
  if (!isActiveSubLogic(sub)) return null;
  return sub.tier || "standard";
}
