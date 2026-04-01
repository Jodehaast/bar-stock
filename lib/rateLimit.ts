/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Suitable for single-server deployments.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number
  /** Window duration in seconds */
  windowSecs: number
}

/**
 * Returns true if the request is within limits, false if rate-limited.
 * @param key   Unique key per client/route (e.g. IP + route)
 */
export function checkRateLimit(key: string, options: RateLimitOptions): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + options.windowSecs * 1000 })
    return true
  }

  if (entry.count >= options.limit) return false

  entry.count++
  return true
}
