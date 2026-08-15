export function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function validatePromo(promo, now = Date.now()) {
  if (!promo) return { ok: false, reason: "Promo code not found" };
  if (!promo.active) return { ok: false, reason: "Promo code is not active" };
  const start = promo.startsAt ? new Date(promo.startsAt).getTime() : 0;
  const end = promo.expiresAt ? new Date(promo.expiresAt).getTime() : Infinity;
  if (now < start) return { ok: false, reason: "Promo code is not active yet" };
  if (now > end) return { ok: false, reason: "Promo code has expired" };
  const maxUses = Number(promo.maxUses) || 0;
  if (maxUses > 0 && Number(promo.uses || 0) >= maxUses) {
    return { ok: false, reason: "Promo code has reached its usage limit" };
  }
  const percentOff = Number(promo.percentOff) || 0;
  const amountOff = Number(promo.amountOffCents) || 0;
  if (percentOff <= 0 && amountOff <= 0) {
    return { ok: false, reason: "Promo code has no discount set" };
  }
  return { ok: true, promo };
}
