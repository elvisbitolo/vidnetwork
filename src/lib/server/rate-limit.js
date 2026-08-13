import { NextResponse } from "next/server";

const DEFAULT_WINDOW_MS = 60 * 1000;
const MAX_BUCKETS = 5000;

const buckets = new Map();

export function rateLimit(key, { limit = 60, windowMs = DEFAULT_WINDOW_MS } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function rateLimitGuard(key, options) {
  const result = rateLimit(key, options);
  if (!result.allowed) {
    return NextResponse.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }
  return null;
}
