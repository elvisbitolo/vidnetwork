export const TIERS = ["standard", "premium"];

export const TIER_INFO = {
  standard: {
    name: "Community",
    videoChat: { canJoin: true, canHost: false, monthlyHours: 8 },
  },
  premium: {
    name: "Creator",
    videoChat: { canJoin: true, canHost: true, monthlyHours: Infinity },
  },
};

export function tierLabel(tier) {
  return TIER_INFO[tier]?.name || "Community";
}

export function tierRank(tier) {
  return TIERS.indexOf(tier);
}

export function meetsTier(userTier, requiredTier) {
  if (!requiredTier || requiredTier === "standard") return true;
  return tierRank(userTier) >= tierRank(requiredTier);
}

export function videoChatRights(tier) {
  return TIER_INFO[tier]?.videoChat || TIER_INFO.standard.videoChat;
}

export function priceIdFor(tier, plan) {
  const key = `STRIPE_PRICE_${String(tier || "standard").toUpperCase()}_${String(plan).toUpperCase()}`;
  return process.env[key] || process.env[`STRIPE_PRICE_${String(plan).toUpperCase()}`] || null;
}
