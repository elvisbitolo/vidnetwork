export const TIERS = ["standard", "premium"];

export function tierLabel(tier) {
  const labels = { standard: "Standard", premium: "Premium" };
  return labels[tier] || "Standard";
}

export function tierRank(tier) {
  return TIERS.indexOf(tier);
}

export function meetsTier(userTier, requiredTier) {
  if (!requiredTier || requiredTier === "standard") return true;
  return tierRank(userTier) >= tierRank(requiredTier);
}

export function priceIdFor(tier, plan) {
  const key = `STRIPE_PRICE_${String(tier || "standard").toUpperCase()}_${String(plan).toUpperCase()}`;
  return process.env[key] || process.env[`STRIPE_PRICE_${String(plan).toUpperCase()}`] || null;
}
