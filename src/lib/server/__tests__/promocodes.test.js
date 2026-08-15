import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, validatePromo } from "../promocodes-core.js";

const NOW = Date.UTC(2026, 0, 15);

function promo(overrides = {}) {
  return {
    code: "LAUNCH20",
    active: true,
    percentOff: 20,
    amountOffCents: 0,
    maxUses: 0,
    uses: 0,
    ...overrides,
  };
}

test("normalizeCode: trims, lowercases and strips invalid chars", () => {
  assert.equal(normalizeCode("  Launch 20! "), "launch-20");
  assert.equal(normalizeCode(""), "");
  assert.equal(normalizeCode(null), "");
});

test("validatePromo: missing promo is rejected", () => {
  assert.equal(validatePromo(null, NOW).ok, false);
  assert.equal(validatePromo(undefined, NOW).ok, false);
});

test("validatePromo: inactive promo is rejected", () => {
  const result = validatePromo(promo({ active: false }), NOW);
  assert.equal(result.ok, false);
  assert.match(result.reason, /not active/i);
});

test("validatePromo: expired promo is rejected", () => {
  const result = validatePromo(promo({ expiresAt: "2025-12-31" }), NOW);
  assert.equal(result.ok, false);
  assert.match(result.reason, /expired/i);
});

test("validatePromo: promo with a future start is rejected", () => {
  const result = validatePromo(promo({ startsAt: "2026-06-01" }), NOW);
  assert.equal(result.ok, false);
});

test("validatePromo: promo at usage limit is rejected", () => {
  const result = validatePromo(promo({ maxUses: 5, uses: 5 }), NOW);
  assert.equal(result.ok, false);
  assert.match(result.reason, /usage limit/i);
});

test("validatePromo: unlimited promo with used counts passes", () => {
  const result = validatePromo(promo({ maxUses: 0, uses: 50 }), NOW);
  assert.equal(result.ok, true);
});

test("validatePromo: promo with no discount is rejected", () => {
  const result = validatePromo(promo({ percentOff: 0, amountOffCents: 0 }), NOW);
  assert.equal(result.ok, false);
  assert.match(result.reason, /no discount/i);
});

test("validatePromo: valid percent-off promo passes", () => {
  const result = validatePromo(promo({ percentOff: 25 }), NOW);
  assert.equal(result.ok, true);
  assert.equal(result.promo.code, "LAUNCH20");
});

test("validatePromo: valid amount-off promo passes", () => {
  const result = validatePromo(promo({ percentOff: 0, amountOffCents: 1000 }), NOW);
  assert.equal(result.ok, true);
});
