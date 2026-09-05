import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_STATUSES,
  isActiveSub,
  periodEndMillis,
  subscriptionStatus,
  toMillis,
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

test("toMillis accepts Timestamp, Date, and numeric values", () => {
  const ts = 1_700_000_000_000;
  assert.equal(toMillis(ts), ts);
  assert.equal(toMillis(new Date(ts)), ts);
  assert.equal(toMillis({ toMillis: () => ts }), ts);
  assert.equal(toMillis(null), 0);
  assert.equal(toMillis("nope"), 0);
});

test("ACTIVE_STATUSES is the documented set", () => {
  assert.deepEqual(ACTIVE_STATUSES, ["active", "trialing", "past_due"]);
});