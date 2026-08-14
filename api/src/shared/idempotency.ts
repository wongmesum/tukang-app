import { getRedis } from "./redis";

/**
 * Idempotency support for unsafe operations.
 *
 * Problem: a double-tapped submit button, or a mobile client retrying after a
 * flaky connection, creates duplicate orders. The customer gets charged twice
 * and two workers get dispatched.
 *
 * Solution: the client sends a stable `Idempotency-Key` header per attempt.
 * The first request claims the key and stores its response; any repeat with
 * the same key gets the original response back instead of doing the work
 * again.
 *
 * A single Redis key holds both states so claiming is atomic:
 *   - value `IN_FLIGHT`  → a request is currently being processed
 *   - value `{"status":…,"body":…}` → the completed response
 */

const KEY_PREFIX = "idem:";
const IN_FLIGHT = "IN_FLIGHT";

/**
 * How long a completed response stays replayable. Long enough to cover a user
 * retrying after losing connectivity, short enough to bound memory.
 */
const COMPLETED_TTL_SECONDS = 24 * 60 * 60;

/**
 * How long a claim can stay unfinished before another attempt may take over.
 * Must exceed the slowest expected handler, or a slow request would be
 * treated as abandoned while still running.
 */
const IN_FLIGHT_TTL_SECONDS = 60;

export interface StoredResponse {
  status: number;
  body: unknown;
}

export type ClaimResult =
  /** This request owns the key and should do the work. */
  | { state: "claimed" }
  /** Another request with the same key is still running. */
  | { state: "in_flight" }
  /** Already completed — replay this response. */
  | { state: "completed"; response: StoredResponse };

/**
 * Keys are namespaced per user so one client's key can never collide with
 * another's, even if both pick the same UUID.
 */
function buildKey(userId: string, idempotencyKey: string): string {
  return `${KEY_PREFIX}${userId}:${idempotencyKey}`;
}

/**
 * Attempt to claim an idempotency key.
 *
 * Uses SET NX so that exactly one of several concurrent requests wins.
 */
export async function claimIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<ClaimResult> {
  const redis = getRedis();
  const key = buildKey(userId, idempotencyKey);

  const client = redis as typeof redis & {
    set(k: string, v: string, ...args: unknown[]): Promise<string | null>;
  };

  try {
    const claimed = await client.set(key, IN_FLIGHT, "EX", IN_FLIGHT_TTL_SECONDS, "NX");
    if (claimed === "OK") {
      return { state: "claimed" };
    }

    // Someone else holds the key — find out whether they finished.
    const existing = await redis.get(key);

    if (existing === null) {
      // Expired between our SET and GET. Treat as claimed rather than
      // blocking the user on a key that no longer exists.
      return { state: "claimed" };
    }

    if (existing === IN_FLIGHT) {
      return { state: "in_flight" };
    }

    try {
      return { state: "completed", response: JSON.parse(existing) as StoredResponse };
    } catch {
      // Corrupted entry — drop it and let this request proceed.
      await redis.del(key);
      return { state: "claimed" };
    }
  } catch {
    // If the store is unavailable, fall back to processing the request.
    // Losing deduplication is better than refusing all writes.
    return { state: "claimed" };
  }
}

/**
 * Record the outcome so repeats can replay it.
 */
export async function storeIdempotentResponse(
  userId: string,
  idempotencyKey: string,
  status: number,
  body: unknown,
): Promise<void> {
  try {
    const payload: StoredResponse = { status, body };
    await getRedis().setex(
      buildKey(userId, idempotencyKey),
      COMPLETED_TTL_SECONDS,
      JSON.stringify(payload),
    );
  } catch {
    // A failed cache write only costs deduplication on retry.
  }
}

/**
 * Drop a claim so the client can retry.
 *
 * Called when the handler failed: keeping the claim would make the user wait
 * out the TTL before they could try again.
 */
export async function releaseIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<void> {
  try {
    await getRedis().del(buildKey(userId, idempotencyKey));
  } catch {
    // The claim expires on its own via TTL.
  }
}

/**
 * Read the `Idempotency-Key` header.
 *
 * Returns null when absent — idempotency stays opt-in so existing clients
 * keep working.
 */
export function readIdempotencyKey(header: string | undefined): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  // Reject junk that would pollute the keyspace.
  if (trimmed.length < 8 || trimmed.length > 200) return null;
  return trimmed;
}
