export function createRateLimiter({ limit = 60, windowMs = 60 * 1000, maxBuckets = 5000 } = {}) {
  const buckets = new Map();

  function check(key, now = Date.now()) {
    if (buckets.size > maxBuckets) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }

    const entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt, retryAfterMs: 0 };
    }

    entry.count += 1;
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
      retryAfterMs: Math.max(0, entry.resetAt - now),
    };
  }

  return {
    check,
    size: () => buckets.size,
    reset: () => buckets.clear(),
  };
}
