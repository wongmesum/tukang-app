import type { Context, Next } from "hono";
import { env } from "../config/env";
import { getRedis } from "./redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyFn?: (context: Context) => string;
  message?: string;
  prefix?: string;
}

const DEFAULT_KEY_FN = (context: Context): string => {
  return (
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    context.req.header("x-real-ip") ??
    "unknown"
  );
};

// --- In-memory rate limiter (single instance, dev/test) ---

function createInMemoryRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message = "Terlalu banyak request" } = options;
  const keyFn = options.keyFn ?? DEFAULT_KEY_FN;
  const store = new Map<string, RateLimitEntry>();

  const CLEANUP_INTERVAL_MS = Math.max(windowMs * 2, 60_000);
  let lastCleanup = Date.now();

  function cleanup(now: number): void {
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }

  return async function rateLimitMiddleware(context: Context, next: Next): Promise<Response | void> {
    const now = Date.now();
    cleanup(now);

    const key = keyFn(context);
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      context.header("Retry-After", String(retryAfterSec));
      return context.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message,
            retry_after_seconds: retryAfterSec,
          },
        },
        429,
      );
    }

    await next();
  };
}

// --- Redis rate limiter (multi-instance, production) ---

function createRedisRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message = "Terlalu banyak request" } = options;
  const keyFn = options.keyFn ?? DEFAULT_KEY_FN;
  const prefix = options.prefix ?? "rl";
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async function rateLimitMiddleware(context: Context, next: Next): Promise<Response | void> {
    const redis = getRedis();
    const clientKey = keyFn(context);
    const redisKey = `${prefix}:${clientKey}`;

    try {
      const count = await redis.incr(redisKey);

      // Set TTL on first request in this window
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      if (count > maxRequests) {
        const ttl = await redis.ttl(redisKey);
        const retryAfterSec = ttl > 0 ? ttl : windowSeconds;
        context.header("Retry-After", String(retryAfterSec));
        return context.json(
          {
            success: false,
            error: {
              code: "TOO_MANY_REQUESTS",
              message,
              retry_after_seconds: retryAfterSec,
            },
          },
          429,
        );
      }

      await next();
    } catch {
      // If Redis fails, allow the request (fail-open)
      await next();
    }
  };
}

// --- Factory: picks implementation based on environment ---

export function createRateLimiter(options: RateLimiterOptions) {
  if (env.NODE_ENV === "test" || !env.REDIS_URL) {
    return createInMemoryRateLimiter(options);
  }
  return createRedisRateLimiter(options);
}

// Pre-configured limiters
export const generalLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
  prefix: "rl:gen",
});

export const otpLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  prefix: "rl:otp",
  message: "Terlalu banyak permintaan OTP. Coba lagi sebentar.",
});
