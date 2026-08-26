import { test } from "node:test";
import assert from "node:assert/strict";
import { TIERS, tierRank, tierLabel, meetsTier, priceIdFor } from "../plans.js";

test("TIERS order is standard then premium", () => {
  assert.deepEqual(TIERS, ["standard", "premium"]);
});

test("tierRank orders tiers", () => {
  assert.equal(tierRank("standard"), 0);
  assert.equal(tierRank("premium"), 1);
  assert.equal(tierRank("unknown"), -1);
});

test("tierLabel maps tiers and defaults", () => {
  assert.equal(tierLabel("standard"), "Community");
  assert.equal(tierLabel("premium"), "Creator");
  assert.equal(tierLabel("nope"), "Community");
});

test("meetsTier: no requirement or standard requirement is always met", () => {
  assert.equal(meetsTier("standard", undefined), true);
  assert.equal(meetsTier("premium", "standard"), true);
  assert.equal(meetsTier(null, "standard"), true);
  assert.equal(meetsTier(null, null), true);
});

test("meetsTier: premium requirement gates standard users", () => {
  assert.equal(meetsTier("standard", "premium"), false);
  assert.equal(meetsTier("premium", "premium"), true);
});

test("priceIdFor returns null when not configured", () => {
  assert.equal(priceIdFor("standard", "MONTHLY"), null);
});

test("priceIdFor reads the tiered env var", () => {
  process.env.STRIPE_PRICE_PREMIUM_YEARLY = "price_premium_yearly";
  assert.equal(priceIdFor("premium", "YEARLY"), "price_premium_yearly");
  delete process.env.STRIPE_PRICE_PREMIUM_YEARLY;
});

test("priceIdFor falls back to the legacy plan var", () => {
  process.env.STRIPE_PRICE_MONTHLY = "price_monthly";
  assert.equal(priceIdFor("standard", "MONTHLY"), "price_monthly");
  delete process.env.STRIPE_PRICE_MONTHLY;
});
