/**
 * lib/rate-limit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simple in-memory sliding-window rate limiter.
 *
 * USAGE:
 *   const rl = rateLimit(`fir:${session.userId}`, 5, 60 * 60 * 1000)
 *   if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
 *
 * IMPORTANT LIMITATIONS:
 *   - State lives in process memory — not shared across multiple server instances.
 *   - If you deploy to a multi-process or multi-instance environment (Vercel,
 *     AWS with autoscaling) you MUST replace this with a Redis-backed solution
 *     (e.g. upstash/ratelimit) to get accurate counts.
 *   - For a single-process dev/demo environment this is perfectly adequate.
 *
 * KEYS USED IN THIS PROJECT:
 *   `login:<ip>`          — 10 attempts per 15 min  (login endpoint)
 *   `fir:<userId>`        — 5 FIRs per hour          (FIR creation)
 *   `evidence:<userId>`   — 20 uploads per hour       (evidence upload)
 */

interface Entry {
  /** Number of requests made in the current window */
  count: number;
  /** Timestamp when the window resets (ms since epoch) */
  resetAt: number;
}

const store = new Map<string, Entry>();

// Evict expired entries every 5 minutes to prevent unbounded memory growth.
// `.unref()` ensures this timer doesn't keep a Node process alive after shutdown.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  /** Whether this request is allowed */
  allowed: boolean;
  /** How many more requests are allowed in the current window */
  remaining: number;
  /** Milliseconds until the window resets */
  resetInMs: number;
}

/**
 * Check and increment the rate limit counter for a given key.
 *
 * @param key      Unique identifier — typically `"<action>:<userId>"` or `"<action>:<ip>"`
 * @param limit    Maximum number of requests allowed within `windowMs`
 * @param windowMs Duration of the rate-limit window in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry, or window has expired — start a fresh window
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  // Window is still active and limit has been reached
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: entry.resetAt - now };
  }

  // Window is active and limit not yet reached — increment and allow
  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInMs: entry.resetAt - now,
  };
}
