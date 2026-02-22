/**
 * Rate limiting for API routes.
 * 10 req/min per user (authenticated), 5 req/min per IP (unauthenticated).
 * Uses in-memory store by default; for multi-instance production set
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (see README).
 */

import { Redis } from "@upstash/redis";

export type RateLimitBucket = { count: number; resetAt: number };

/** Store interface so production can use Redis/Upstash/Vercel KV. */
export interface RateLimitStore {
  /** Atomically increment (or create) the bucket for key; return new count and resetAt. */
  increment(key: string, windowMs: number): Promise<RateLimitBucket>;
}

const AUTHED_LIMIT = 10;
const UNAUTHED_LIMIT = 5;
const WINDOW_MS = 60_000;

const RL_PREFIX = "rl:";

/** Lazy-initialized Upstash Redis store when env vars are set. */
function createUpstashStore(): RateLimitStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  return {
    async increment(key: string, windowMs: number): Promise<RateLimitBucket> {
      const rlKey = RL_PREFIX + key;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.pexpire(rlKey, windowMs);
      const ttl = await redis.pttl(rlKey);
      const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);
      return { count, resetAt };
    },
  };
}

const redisStore: RateLimitStore | null = createUpstashStore();

/** In-memory implementation. Resets on deploy/restart; single-instance only. */
const buckets = new Map<string, RateLimitBucket>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}
if (typeof setInterval !== "undefined") {
  setInterval(prune, 60_000);
}

const inMemoryStore: RateLimitStore = {
  async increment(key: string, windowMs: number): Promise<RateLimitBucket> {
    const now = Date.now();
    const existing = buckets.get(key);
    if (existing && existing.resetAt > now) {
      existing.count += 1;
      return existing;
    }
    const bucket: RateLimitBucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return bucket;
  },
};

/** Default store: Upstash Redis when configured, otherwise in-memory. */
const defaultStore: RateLimitStore = redisStore ?? inMemoryStore;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number };

/**
 * Check rate limit. Use userId for authenticated requests, otherwise identifier (e.g. IP).
 * When store is omitted, uses Upstash Redis if UPSTASH_REDIS_* env vars are set, else in-memory.
 */
export async function checkRateLimit(
  identifier: string,
  authenticated: boolean,
  store?: RateLimitStore
): Promise<RateLimitResult> {
  const limit = authenticated ? AUTHED_LIMIT : UNAUTHED_LIMIT;
  const key = authenticated ? `user:${identifier}` : `ip:${identifier}`;
  const s = store ?? defaultStore;
  const bucket = await s.increment(key, WINDOW_MS);
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - Date.now()) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }
  return { allowed: true };
}

export const RATE_LIMIT_ERROR = "Too many requests. Please slow down.";
