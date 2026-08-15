import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";
import {
  purchaseKey,
  isPurchasable,
  canAccessPaid,
  verifyPurchaseAmount,
} from "@/lib/server/purchases-core";

export {
  purchaseKey,
  isPurchasable,
  canAccessPaid,
  verifyPurchaseAmount,
};

export const PURCHASE_TYPES = ["course", "event", "space"];

export const PURCHASE_COLLECTIONS = {
  course: "courses",
  event: "events",
  space: "spaces",
};

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

export async function getOrCreateStripePrice({ targetType, targetId, collection, item }) {
  const stripe = getStripe();
  const expected = Math.round(Number(item?.purchasePriceCents) || 0);
  if (expected <= 0) {
    throw new Error("Item is not purchasable");
  }

  if (item?.stripePriceId) {
    try {
      const existing = await stripe.prices.retrieve(item.stripePriceId);
      if (existing && existing.active && Number(existing.unit_amount) === expected) {
        return existing;
      }
    } catch {
      // Fall through and create a fresh price if the cached one is gone.
    }
  }

  const product = await stripe.products.create({
    name: `${item.title || item.name || "Community content"} (${targetType})`,
    metadata: { targetType, targetId },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: expected,
    currency: "usd",
    metadata: { targetType, targetId },
  });

  await adminDb()
    .collection(collection)
    .doc(targetId)
    .update({ stripeProductId: product.id, stripePriceId: price.id });

  return price;
}
