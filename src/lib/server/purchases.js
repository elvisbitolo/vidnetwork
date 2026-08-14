import { adminDb } from "@/lib/firebase/admin";

export const PURCHASE_TYPES = ["course", "event", "space"];

export function purchaseKey(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

export function isPurchasable(item) {
  return Number(item?.purchasePriceCents) > 0;
}

export function canAccessPaid(targetType, item, purchasedKeys) {
  if (!isPurchasable(item)) return true;
  return !!purchasedKeys && purchasedKeys.has(purchaseKey(targetType, item.id));
}

export async function getPurchasedKeys(uid) {
  const snap = await adminDb().collection("purchases").where("uid", "==", uid).get();
  const keys = new Set();
  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.targetType && data.targetId) {
      keys.add(purchaseKey(data.targetType, data.targetId));
    }
  });
  return keys;
}

export async function hasPurchased(uid, targetType, targetId) {
  const doc = await adminDb()
    .collection("purchases")
    .doc(`${uid}_${targetType}_${targetId}`)
    .get();
  return doc.exists;
}

export async function recordPurchase({ uid, targetType, targetId, sessionId }) {
  const ref = adminDb().collection("purchases").doc(`${uid}_${targetType}_${targetId}`);
  await ref.set(
    {
      uid,
      targetType,
      targetId,
      sessionId: sessionId || "",
      purchasedAt: new Date(),
    },
    { merge: true }
  );
}
