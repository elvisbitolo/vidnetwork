import { test } from "node:test";
import assert from "node:assert/strict";
import { TIERS, tierRank, tierLabel, meetsTier, priceIdFor } from "../plans.js";

test("TIERS order is lounge, plus, host", () => {
  assert.deepEqual(TIERS, ["lounge", "plus", "host"]);
});

test("tierRank orders tiers", () => {
  assert.equal(tierRank("lounge"), 0);
  assert.equal(tierRank("plus"), 1);
  assert.equal(tierRank("host"), 2);
  assert.equal(tierRank("unknown"), -1);
});

test("tierRank maps legacy tiers", () => {
  assert.equal(tierRank("standard"), 0);
  assert.equal(tierRank("premium"), 2);
  assert.equal(tierRank("community"), 0);
  assert.equal(tierRank("creator"), 2);
});

test("tierLabel maps tiers and defaults", () => {
  assert.equal(tierLabel("lounge"), "Yarnery Lounge");
  assert.equal(tierLabel("plus"), "Yarnery Plus");
  assert.equal(tierLabel("host"), "Yarnery Host");
  assert.equal(tierLabel("nope"), "Yarnery Lounge");
});

test("meetsTier: no requirement or lounge requirement is always met", () => {
  assert.equal(meetsTier("lounge", undefined), true);
  assert.equal(meetsTier("plus", "lounge"), true);
  assert.equal(meetsTier(null, "lounge"), true);
  assert.equal(meetsTier(null, null), true);
});

test("meetsTier: host requirement gates lower tiers", () => {
  assert.equal(meetsTier("lounge", "host"), false);
  assert.equal(meetsTier("plus", "host"), false);
  assert.equal(meetsTier("host", "host"), true);
});

test("meetsTier: legacy premium requirement maps to host", () => {
  assert.equal(meetsTier("standard", "premium"), false);
  assert.equal(meetsTier("premium", "premium"), true);
  assert.equal(meetsTier("host", "premium"), true);
});

test("priceIdFor returns null when not configured", () => {
  assert.equal(priceIdFor("lounge", "MONTHLY"), null);
});

test("priceIdFor reads the tiered env var", () => {
  process.env.STRIPE_PRICE_HOST_YEARLY = "price_host_yearly";
  assert.equal(priceIdFor("host", "YEARLY"), "price_host_yearly");
  delete process.env.STRIPE_PRICE_HOST_YEARLY;
});

test("priceIdFor falls back to the legacy plan var", () => {
  process.env.STRIPE_PRICE_MONTHLY = "price_monthly";
  assert.equal(priceIdFor("lounge", "MONTHLY"), "price_monthly");
  delete process.env.STRIPE_PRICE_MONTHLY;
});