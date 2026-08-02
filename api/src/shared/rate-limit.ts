import type { Context, Next } from "hono";

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
  return (
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    context.req.header("x-real-ip") ??
    "unknown"
  );
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
