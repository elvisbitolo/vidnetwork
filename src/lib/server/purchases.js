import { adminDb } from "@/lib/firebase/admin";
import { purchaseKey } from "@/lib/server/purchases-core";

export const PURCHASE_TYPES = ["course", "event", "space"];

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

export async function recordPurchase({ uid, targetType, targetId, sessionId, promoCode }) {
  const ref = adminDb().collection("purchases").doc(`${uid}_${targetType}_${targetId}`);
  await ref.set(
    {
      uid,
      targetType,
      targetId,
      sessionId: sessionId || "",
      promoCode: promoCode || "",
      purchasedAt: new Date(),
    },
    { merge: true }
  );
}