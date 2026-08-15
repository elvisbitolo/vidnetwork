import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit-core";

const DEFAULT_WINDOW_MS = 60 * 1000;
const defaultLimiter = createRateLimiter({ limit: 60, windowMs: DEFAULT_WINDOW_MS });
const customLimiters = new Map();

function limiterFor({ limit = 60, windowMs = DEFAULT_WINDOW_MS } = {}) {
  if (limit === 60 && windowMs === DEFAULT_WINDOW_MS) return defaultLimiter;
  const key = `${limit}:${windowMs}`;
  let limiter = customLimiters.get(key);
  if (!limiter) {
    limiter = createRateLimiter({ limit, windowMs });
    customLimiters.set(key, limiter);
  }
  return limiter;
}

export function rateLimit(key, options) {
  return limiterFor(options).check(key);
}

export function rateLimitGuard(key, options) {
  const result = rateLimit(key, options);
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests, try again shortly" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))),
        },
      }
    );
  }
  return null;
}
