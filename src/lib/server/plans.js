export const TIERS = ["lounge", "plus", "host"];

export const LEGACY_ALIASES = {
  standard: "lounge",
  community: "lounge",
  premium: "host",
  creator: "host",
};

function normalize(tier) {
  const t = LEGACY_ALIASES[tier] || tier;
  return TIERS.includes(t) ? t : null;
}

export const TIER_INFO = {
  lounge: {
    name: "Yarnery Lounge",
    priceCents: 999,
    founding: { priceCents: 699, slots: 100 },
    videoChat: { canJoin: true, canHost: false, monthlyHours: 8 },
  },
  plus: {
    name: "Yarnery Plus",
    priceCents: 1999,
    videoChat: { canJoin: true, canHost: false, monthlyHours: 24 },
  },
  host: {
    name: "Yarnery Host",
    priceCents: 2999,
    videoChat: { canJoin: true, canHost: true, monthlyHours: Infinity },
  },
};

export function tierLabel(tier) {
  return TIER_INFO[normalize(tier)]?.name || "Yarnery Lounge";
}

export function tierRank(tier) {
  const idx = TIERS.indexOf(normalize(tier) || "");
  return idx === -1 ? -1 : idx;
}

export function meetsTier(userTier, requiredTier) {
  if (requiredTier == null || requiredTier === "") return true;
  const req = normalize(requiredTier);
  if (!req || req === "lounge") return true;
  return tierRank(userTier) >= tierRank(req);
}

export function videoChatRights(tier) {
  return TIER_INFO[normalize(tier)]?.videoChat || TIER_INFO.lounge.videoChat;
}

export function priceIdFor(tier, plan) {
  const key = `STRIPE_PRICE_${String(tier || "lounge").toUpperCase()}_${String(plan).toUpperCase()}`;
  return process.env[key] || process.env[`STRIPE_PRICE_${String(plan).toUpperCase()}`] || null;
}