/**
 * Sliding-window in-memory rate limiter for sensitive endpoints (password reset, auth, newsletter).
 * Note: For multi-instance deployments, configure Redis-backed rate limiting at the reverse proxy/CDN layer as well.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

const MAX_KEYS_PER_BUCKET = 10000

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(
  bucket: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  let store = stores.get(bucket)
  if (!store) {
    store = new Map<string, RateLimitEntry>()
    stores.set(bucket, store)
  }

  // Opportunistic cleanup to avoid unbounded memory growth
  if (store.size > MAX_KEYS_PER_BUCKET) {
    for (const [k, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(k)
      }
    }
  }

  const key = (identifier || "unknown").toLowerCase().trim()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

export function getClientIp(req: { headers?: Record<string, any>; ip?: string; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers?.["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = req.headers?.["x-real-ip"]
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim()
  }
  return req.ip || req.socket?.remoteAddress || "unknown"
}
