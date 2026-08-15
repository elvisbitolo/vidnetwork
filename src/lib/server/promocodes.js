import { adminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/server/stripe";
import { normalizeCode, validatePromo } from "@/lib/server/promocodes-core";

export { normalizeCode, validatePromo };

export async function getPromoByCode(code) {
  const snap = await adminDb()
    .collection("promoCodes")
    .where("code", "==", normalizeCode(code))
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function listPromos() {
  const snap = await adminDb().collection("promoCodes").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis
        ? data.createdAt.toMillis()
        : data.createdAt
          ? new Date(data.createdAt).getTime()
          : 0,
    };
  });
}

export async function createPromo({ code, percentOff, amountOffCents, maxUses, expiresAt, active, createdBy }) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    throw Object.assign(new Error("A promo code is required"), { code: 400 });
  }
  const existing = await getPromoByCode(normalized);
  if (existing) {
    throw Object.assign(new Error("That promo code already exists"), { code: 409 });
  }
  const percent = Math.min(Math.max(Number(percentOff) || 0, 0), 100);
  const amount = Math.max(Number(amountOffCents) || 0, 0);
  if (percent <= 0 && amount <= 0) {
    throw Object.assign(new Error("Set a percent or amount discount"), { code: 400 });
  }
  const ref = adminDb().collection("promoCodes").doc();
  await ref.set({
    code: normalized,
    percentOff: percent,
    amountOffCents: amount,
    maxUses: Math.max(Number(maxUses) || 0, 0),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    active: active !== false,
    uses: 0,
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id, code: normalized };
}

export async function updatePromo(id, patch = {}) {
  const ref = adminDb().collection("promoCodes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = {};
  if (patch.active !== undefined) data.active = !!patch.active;
  if (patch.maxUses !== undefined) data.maxUses = Math.max(Number(patch.maxUses) || 0, 0);
  if (patch.expiresAt !== undefined) {
    data.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
  }
  await ref.update(data);
  return { id, ...doc.data(), ...data };
}

export async function deletePromo(id) {
  await adminDb().collection("promoCodes").doc(id).delete();
}

export async function recordPromoUse(code) {
  const snap = await adminDb()
    .collection("promoCodes")
    .where("code", "==", normalizeCode(code))
    .limit(1)
    .get();
  if (snap.empty) return;
  await adminDb()
    .collection("promoCodes")
    .doc(snap.docs[0].id)
    .update({ uses: (snap.docs[0].data().uses || 0) + 1 });
}

export async function getOrCreateStripeCoupon(promo) {
  const stripe = getStripe();
  const couponId = `vidnetwork-${promo.code}`;
  const percentOff = Number(promo.percentOff) || 0;
  const amountOff = Number(promo.amountOffCents) || 0;

  try {
    const existing = await stripe.coupons.retrieve(couponId);
    if (existing && existing.percent_off === percentOff && existing.amount_off === amountOff) {
      return existing;
    }
  } catch {
    // Coupon not found — create it below.
  }

  return stripe.coupons.create({
    id: couponId,
    percent_off: percentOff > 0 ? percentOff : undefined,
    amount_off: amountOff > 0 ? amountOff : undefined,
    currency: amountOff > 0 ? "usd" : undefined,
    duration: "once",
  });
}
