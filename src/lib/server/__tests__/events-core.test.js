import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRsvpCounts } from "../events-core.js";

test("applyRsvpCounts: joining under capacity increments", () => {
  const { full, counts } = applyRsvpCounts({ a: 2 }, "b", 5, true);
  assert.equal(full, false);
  assert.deepEqual(counts, { a: 2, b: 1 });
});

test("applyRsvpCounts: joining at capacity is full", () => {
  const { full, counts } = applyRsvpCounts({ a: 5 }, "a", 5, true);
  assert.equal(full, true);
  assert.deepEqual(counts, { a: 5 });
});

test("applyRsvpCounts: joining with no capacity never fills", () => {
  const { full, counts } = applyRsvpCounts({ a: 999 }, "a", 0, true);
  assert.equal(full, false);
  assert.equal(counts.a, 1000);
});

test("applyRsvpCounts: leaving decrements", () => {
  const { counts } = applyRsvpCounts({ a: 3 }, "a", 5, false);
  assert.deepEqual(counts, { a: 2 });
});

test("applyRsvpCounts: leaving a zero-count key drops it", () => {
  const { counts } = applyRsvpCounts({ a: 1 }, "a", 5, false);
  assert.deepEqual(counts, {});
});

test("applyRsvpCounts: missing counts default to zero", () => {
  const { full, counts } = applyRsvpCounts(null, "x", 2, true);
  assert.equal(full, false);
  assert.deepEqual(counts, { x: 1 });
});
