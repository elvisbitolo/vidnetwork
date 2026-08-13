export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export function toMillis(value) {
  if (value == null) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function fromEpoch(seconds) {
  if (!seconds) return null;
  const n = Number(seconds);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

export function periodEndMillis(sub) {
  const current = toMillis(sub?.currentPeriodEnd);
  const trial = toMillis(sub?.trialEnd);
  return Math.max(current, trial);
}

export function isActiveSub(sub, now = Date.now()) {
  if (!sub) return false;
  if (!ACTIVE_STATUSES.includes(sub.status)) return false;
  const end = periodEndMillis(sub);
  return end === 0 || end > now;
}

export function subscriptionStatus(sub, now = Date.now()) {
  if (!sub) return "none";
  if (sub.status === "canceled" || sub.canceledAt) return "canceled";
  if (sub.status === "paused") return "paused";
  if (sub.status === "incomplete") return "incomplete";
  if (sub.status === "past_due") {
    return isActiveSub(sub, now) ? "past_due" : "inactive";
  }
  if (sub.status === "trialing" && isActiveSub(sub, now)) return "trialing";
  if (sub.status === "active") {
    if (!isActiveSub(sub, now)) return "inactive";
    return sub.cancelAtPeriodEnd ? "cancel_at_period_end" : "active";
  }
  return "inactive";
}

export function planFromInterval(interval) {
  return interval === "year" ? "yearly" : interval === "month" ? "monthly" : null;
}

export function tierFromMetadata(sub) {
  return sub?.metadata?.tier || "standard";
}

export function planChange({ currentStatus, currentPriceId, requestedPriceId }) {
  if (!ACTIVE_STATUSES.includes(currentStatus)) return "create";
  if (currentPriceId === requestedPriceId) return "none";
  return "switch";
}

export function buildSubscriptionDoc({ subscription, customer, tier }) {
  const item = subscription?.items?.data?.[0];
  return {
    provider: "stripe",
    providerCustomerId: customer?.id || "",
    providerSubscriptionId: subscription?.id || "",
    status: subscription?.status || "unknown",
    plan: planFromInterval(item?.price?.recurring?.interval),
    tier: tier || tierFromMetadata(subscription) || "standard",
    priceId: item?.price?.id || "",
    currentPeriodStart: fromEpoch(subscription?.current_period_start),
    currentPeriodEnd: fromEpoch(subscription?.current_period_end),
    trialStart: fromEpoch(subscription?.trial_start),
    trialEnd: fromEpoch(subscription?.trial_end),
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    canceledAt: subscription?.canceled_at ? fromEpoch(subscription.canceled_at) : null,
    updatedAt: new Date(),
  };
}
