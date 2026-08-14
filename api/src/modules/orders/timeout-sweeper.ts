import { env } from "../../config/env";
import { acquireLock } from "../../shared/redis";
import { tryAutoMatch } from "../matching/service";
import { orderRepo } from "./repository";
import { transitionOrder } from "./state-machine";
import { notifyOrderTransition } from "./events";
import type { OrderRecord } from "./types";

/**
 * Background sweeper for stale orders.
 *
 * Two rules from the spec:
 *  1. A worker has 3 minutes to accept a MATCHED order. After that the order
 *     is re-queued and offered to the next-best worker. If nobody else is
 *     eligible, it EXPIREs.
 *  2. An order that sits PENDING with no available worker for too long
 *     EXPIREs so the customer isn't left waiting indefinitely.
 *
 * Without this, a MATCHED order assigned to an offline worker would hang
 * forever and the customer would never be told.
 */

/** Spec: "timeout 3 menit → pindah tukang lain" */
const ACCEPT_TIMEOUT_MS = 3 * 60 * 1000;

/** How long an unmatched order keeps trying before giving up. */
const PENDING_EXPIRY_MS = 30 * 60 * 1000;

/** How often to sweep. Short enough that a 3-minute timeout stays accurate. */
const SWEEP_INTERVAL_MS = 30 * 1000;

/**
 * Lock TTL must exceed a sweep's worst-case duration, but stay short enough
 * that a crashed instance doesn't block sweeping for long.
 */
const LOCK_TTL_SECONDS = 25;
const LOCK_NAME = "order-timeout-sweep";

export interface SweepResult {
  rematched: number;
  expired: number;
  skipped: boolean;
}

/**
 * Run one sweep pass. Safe to call directly in tests.
 */
export async function sweepStaleOrders(now: Date = new Date()): Promise<SweepResult> {
  const result: SweepResult = { rematched: 0, expired: 0, skipped: false };

  // Only one instance should sweep per interval.
  const gotLock = await acquireLock(LOCK_NAME, LOCK_TTL_SECONDS);
  if (!gotLock) {
    result.skipped = true;
    return result;
  }

  const candidates = await orderRepo.findByStatuses(["MATCHED", "PENDING"]);

  for (const order of candidates) {
    try {
      if (order.status === "MATCHED") {
        if (isAcceptWindowLapsed(order, now)) {
          const outcome = await handleAcceptTimeout(order);
          if (outcome === "rematched") result.rematched += 1;
          if (outcome === "expired") result.expired += 1;
        }
        continue;
      }

      if (order.status === "PENDING" && isPendingTooLong(order, now)) {
        await expireOrder(order);
        result.expired += 1;
      }
    } catch {
      // One bad order must not abort the whole sweep.
    }
  }

  return result;
}

function isAcceptWindowLapsed(order: OrderRecord, now: Date): boolean {
  // Orders matched before this column existed have no timestamp; fall back to
  // createdAt so they still get swept instead of hanging forever.
  const since = order.matchedAt ?? order.createdAt;
  return now.getTime() - since.getTime() > ACCEPT_TIMEOUT_MS;
}

function isPendingTooLong(order: OrderRecord, now: Date): boolean {
  return now.getTime() - order.createdAt.getTime() > PENDING_EXPIRY_MS;
}

/**
 * A worker didn't accept in time: re-queue and offer it to someone else.
 * The unresponsive worker is excluded so it isn't handed straight back.
 */
async function handleAcceptTimeout(order: OrderRecord): Promise<"rematched" | "expired"> {
  const timedOutWorkerId = order.workerId;

  const requeuedStatus = transitionOrder(order.status, "PENDING");
  const requeued = await orderRepo.update(order.id, {
    status: requeuedStatus,
    workerId: null,
    matchedAt: null,
  });

  const exclude = timedOutWorkerId ? [timedOutWorkerId] : [];
  const rematch = await tryAutoMatch(requeued, exclude);

  if (rematch.ok) {
    return "rematched";
  }

  // Nobody else available — but only give up if the order has also been
  // waiting past the overall PENDING budget. Otherwise leave it PENDING so a
  // worker coming online can still pick it up.
  if (isPendingTooLong(requeued, new Date())) {
    await expireOrder(requeued);
    return "expired";
  }

  return "rematched";
}

async function expireOrder(order: OrderRecord): Promise<void> {
  const nextStatus = transitionOrder(order.status, "EXPIRED");
  const updated = await orderRepo.update(order.id, { status: nextStatus });

  notifyOrderTransition({
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    status: nextStatus,
    customerId: updated.customerId,
    workerId: updated.workerId,
  });
}

// --- Scheduler lifecycle ---

let sweepTimer: ReturnType<typeof setInterval> | null = null;

export function startTimeoutSweeper(): void {
  if (sweepTimer) return;
  if (env.NODE_ENV === "test") return; // tests call sweepStaleOrders() directly

  sweepTimer = setInterval(() => {
    void sweepStaleOrders().catch(() => {
      // Never let a sweep failure crash the process.
    });
  }, SWEEP_INTERVAL_MS);

  // eslint-disable-next-line no-console
  console.log(`[Sweeper] Order timeout sweeper started (every ${SWEEP_INTERVAL_MS / 1000}s)`);
}

export function stopTimeoutSweeper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

export const TIMEOUTS = {
  ACCEPT_TIMEOUT_MS,
  PENDING_EXPIRY_MS,
  SWEEP_INTERVAL_MS,
} as const;
