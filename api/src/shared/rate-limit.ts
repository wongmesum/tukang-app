import type { Context, Next } from "hono";
import { env } from "../config/env";
import { redis } from "./redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyFn?: (context: Context) => string;
  message?: string;
}

const DEFAULT_KEY_FN = (context: Context): string => {
  // If user is authenticated, use userId for more granular limiting
  const user = context.get("user" as never) as { userId?: string } | undefined;
  const ip =
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    context.req.header("x-real-ip") ??
    "unknown";

  if (user?.userId) {
    return `user:${user.userId}`;
  }
  return `ip:${ip}`;
};

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message = "Terlalu banyak request" } = options;
  const keyFn = options.keyFn ?? DEFAULT_KEY_FN;
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup to prevent unbounded memory growth
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
    if (redis) {
      try {
        const redisKey = `rate:${windowMs}:${key}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.expire(redisKey, Math.max(1, Math.ceil(windowMs / 1000)));
        }

        if (count > maxRequests) {
          const ttlSeconds = await redis.ttl(redisKey);
          const retryAfterSec = Math.max(1, ttlSeconds);
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
        return;
      } catch (error) {
        if (env.REDIS_REQUIRED) throw error;
        // cPanel/dev may continue with the process-local fallback.
      }
    }

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

// Pre-configured limiters for common use cases
export const generalLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
});

export const otpLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: "Terlalu banyak permintaan OTP. Coba lagi sebentar.",
});
