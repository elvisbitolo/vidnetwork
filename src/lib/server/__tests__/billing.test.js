import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_STATUSES,
  isActiveSub,
  periodEndMillis,
  subscriptionStatus,
  planFromInterval,
  tierFromMetadata,
  buildSubscriptionDoc,
  fromEpoch,
} from "../billing.js";

const now = Date.now();
const future = now + 30 * 24 * 60 * 60 * 1000;
const past = now - 30 * 24 * 60 * 60 * 1000;

test("isActiveSub: active with future period end", () => {
  assert.equal(isActiveSub({ status: "active", currentPeriodEnd: future }, now), true);
});

test("isActiveSub: active with past period end is inactive", () => {
  assert.equal(isActiveSub({ status: "active", currentPeriodEnd: past }, now), false);
});

test("isActiveSub: trialing falls back to trialEnd", () => {
  assert.equal(
    isActiveSub({ status: "trialing", currentPeriodEnd: past, trialEnd: future }, now),
    true
  );
});

test("isActiveSub: past_due keeps access during grace period", () => {
  assert.equal(isActiveSub({ status: "past_due", currentPeriodEnd: future }, now), true);
});

test("isActiveSub: expired past_due loses access", () => {
  assert.equal(isActiveSub({ status: "past_due", currentPeriodEnd: past }, now), false);
});

test("isActiveSub: canceled/incomplete/none are never active", () => {
  for (const status of ["canceled", "incomplete", "paused", "unknown", "none"]) {
    assert.equal(isActiveSub({ status, currentPeriodEnd: future }, now), false, status);
  }
  assert.equal(isActiveSub(null, now), false);
});

test("isActiveSub: active without any end date stays active", () => {
  assert.equal(isActiveSub({ status: "active" }, now), true);
});

test("periodEndMillis falls back from currentPeriodEnd to trialEnd", () => {
  assert.equal(periodEndMillis({ currentPeriodEnd: 123 }), 123);
  assert.equal(periodEndMillis({ trialEnd: 456 }), 456);
  assert.equal(periodEndMillis({}), 0);
});

test("subscriptionStatus maps canonical states", () => {
  assert.equal(subscriptionStatus({ status: "canceled" }), "canceled");
  assert.equal(subscriptionStatus({ status: "paused" }), "paused");
  assert.equal(subscriptionStatus({ status: "incomplete" }), "incomplete");
  assert.equal(
    subscriptionStatus({ status: "active", currentPeriodEnd: future }, now),
    "active"
  );
  assert.equal(
    subscriptionStatus({ status: "active", currentPeriodEnd: future, cancelAtPeriodEnd: true }, now),
    "cancel_at_period_end"
  );
  assert.equal(
    subscriptionStatus({ status: "active", currentPeriodEnd: past }, now),
    "inactive"
  );
  assert.equal(subscriptionStatus(null), "none");
});

test("planFromInterval maps Stripe intervals", () => {
  assert.equal(planFromInterval("year"), "yearly");
  assert.equal(planFromInterval("month"), "monthly");
  assert.equal(planFromInterval("week"), null);
});

test("tierFromMetadata defaults to standard", () => {
  assert.equal(tierFromMetadata({ metadata: { tier: "premium" } }), "premium");
  assert.equal(tierFromMetadata({}), "standard");
});

test("fromEpoch converts seconds to Date", () => {
  assert.equal(fromEpoch(0), null);
  assert.equal(fromEpoch(1_700_000_000).getTime(), 1_700_000_000_000);
});

test("buildSubscriptionDoc produces the richer doc shape", () => {
  const subscription = {
    id: "sub_123",
    status: "trialing",
    current_period_start: 1_700_000_000,
    current_period_end: 1_710_000_000,
    trial_start: 1_700_000_000,
    trial_end: 1_705_000_000,
    cancel_at_period_end: false,
    canceled_at: null,
    metadata: { tier: "premium" },
    items: { data: [{ price: { id: "price_x", recurring: { interval: "month" } } }] },
  };
  const doc = buildSubscriptionDoc({ subscription, customer: { id: "cus_1" }, tier: "premium" });
  assert.equal(doc.provider, "stripe");
  assert.equal(doc.providerCustomerId, "cus_1");
  assert.equal(doc.providerSubscriptionId, "sub_123");
  assert.equal(doc.status, "trialing");
  assert.equal(doc.plan, "monthly");
  assert.equal(doc.tier, "premium");
  assert.equal(doc.priceId, "price_x");
  assert.equal(doc.currentPeriodEnd.getTime(), 1_710_000_000_000);
  assert.equal(doc.cancelAtPeriodEnd, false);
  assert.equal(doc.canceledAt, null);
  assert.ok(doc.updatedAt instanceof Date);
});

test("ACTIVE_STATUSES is the documented set", () => {
  assert.deepEqual(ACTIVE_STATUSES, ["active", "trialing", "past_due"]);
});
