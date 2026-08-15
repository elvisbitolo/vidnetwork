import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../rate-limit-core.js";

test("rateLimiter: first call allowed with full remaining", () => {
  const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
  const now = 1000;
  const res = rl.check("k", now);
  assert.equal(res.allowed, true);
  assert.equal(res.remaining, 2);
  assert.equal(res.resetAt, now + 1000);
  assert.equal(res.retryAfterMs, 0);
});

test("rateLimiter: exhausts the limit then blocks", () => {
  const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
  const now = 2000;
  assert.equal(rl.check("k", now).allowed, true);
  assert.equal(rl.check("k", now).allowed, true);
  const blocked = rl.check("k", now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterMs, 1000);
});

test("rateLimiter: window expires and resets the bucket", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 500 });
  assert.equal(rl.check("k", 3000).allowed, true);
  assert.equal(rl.check("k", 3000).allowed, false);
  assert.equal(rl.check("k", 3500).allowed, true);
});

test("rateLimiter: keys are independent", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
  assert.equal(rl.check("a", 4000).allowed, true);
  assert.equal(rl.check("a", 4000).allowed, false);
  assert.equal(rl.check("b", 4000).allowed, true);
});

test("rateLimiter: prunes expired buckets when over maxBuckets", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxBuckets: 2 });
  rl.check("a", 5000);
  rl.check("b", 5000);
  assert.equal(rl.size(), 2);
  // exceed the cap, then a subsequent insert triggers the prune
  rl.check("c", 5500);
  assert.equal(rl.size(), 3);
  // at 6000, a and b are expired but c is not; inserting d prunes a and b
  const res = rl.check("d", 6000);
  assert.equal(res.allowed, true);
  assert.equal(rl.size(), 2);
});

test("rateLimiter: reset clears buckets", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
  rl.check("a", 6000);
  rl.reset();
  assert.equal(rl.size(), 0);
  assert.equal(rl.check("a", 6000).allowed, true);
});
