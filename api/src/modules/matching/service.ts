import { orderRepo } from "../orders/repository";
import { transitionOrder } from "../orders/state-machine";
import { workerRepo } from "../workers/repository";
import { notifyWorkerNewMatch } from "../orders/events";
import { rankCandidates } from "./matcher";
import type { MatchCandidate } from "./matcher";
import type { OrderRecord } from "../orders/types";

/**
 * Matching service — shared by the HTTP endpoints and the automatic
 * post-order-creation hook.
 *
 * Keeping this out of route.ts means order creation can trigger matching
 * without an internal HTTP round-trip.
 */

/**
 * Derive the service category from a service id.
 *
 * Seed ids follow `seed-{CATEGORY}-{slug}` (e.g. "seed-AC-cuci-ac-split").
 * Admin-created services use UUIDs, so we fall back to a repository lookup.
 */
export async function resolveCategoryCode(serviceId: string): Promise<string> {
  if (serviceId.startsWith("seed-")) {
    const parts = serviceId.split("-");
    if (parts[1]) return parts[1];
  }

  // UUID-based service — look up its real category
  const { serviceRepo } = await import("../services/repository");
  const service = await serviceRepo.findServiceById(serviceId);
  return service?.categoryCode ?? "";
}

export interface FindCandidatesResult {
  categoryCode: string;
  candidates: MatchCandidate[];
}

/**
 * Rank eligible workers for an order without assigning anyone.
 */
export async function findCandidatesForOrder(
  order: OrderRecord,
): Promise<FindCandidatesResult> {
  const categoryCode = await resolveCategoryCode(order.serviceId);
  const allWorkers = await workerRepo.findAll();

  const candidates = rankCandidates({
    categoryCode,
    customerLocation: order.customerLocation,
    workers: allWorkers,
  });

  return { categoryCode, candidates };
}

export type AssignResult =
  | { ok: true; workerId: string; candidate: MatchCandidate; order: OrderRecord }
  | { ok: false; reason: "NO_WORKER_AVAILABLE" | "NOT_PENDING" | "WORKER_NOT_ELIGIBLE" };

/**
 * Assign a worker to a PENDING order and transition it to MATCHED.
 *
 * When `preferredWorkerId` is omitted the top-ranked candidate is chosen
 * (nearest, then highest rated). Notifies the worker on success.
 *
 * `excludeWorkerIds` prevents re-offering an order to someone who already
 * rejected it — without this, a rejection would immediately re-assign the
 * same worker in a loop.
 */
export async function assignWorkerToOrder(params: {
  order: OrderRecord;
  preferredWorkerId?: string;
  excludeWorkerIds?: string[];
}): Promise<AssignResult> {
  const { order, preferredWorkerId, excludeWorkerIds = [] } = params;

  if (order.status !== "PENDING") {
    return { ok: false, reason: "NOT_PENDING" };
  }

  const { categoryCode, candidates: allCandidates } = await findCandidatesForOrder(order);
  const candidates = excludeWorkerIds.length
    ? allCandidates.filter((c) => !excludeWorkerIds.includes(c.workerId))
    : allCandidates;

  let selected: MatchCandidate | undefined;

  if (preferredWorkerId) {
    selected = candidates.find((c) => c.workerId === preferredWorkerId);
    if (!selected) {
      return { ok: false, reason: "WORKER_NOT_ELIGIBLE" };
    }
  } else {
    selected = candidates[0];
    if (!selected) {
      return { ok: false, reason: "NO_WORKER_AVAILABLE" };
    }
  }

  const nextStatus = transitionOrder(order.status, "MATCHED");
  const updated = await orderRepo.update(order.id, {
    status: nextStatus,
    workerId: selected.workerId,
  });

  // Tell the worker there's an order waiting for them
  notifyWorkerNewMatch({
    workerId: selected.workerId,
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    customerId: updated.customerId,
    categoryCode,
    distanceKm: selected.distanceKm,
    totalEstimate: updated.pricing.totalEstimate,
  });

  return { ok: true, workerId: selected.workerId, candidate: selected, order: updated };
}

/**
 * Fire-and-forget matching used right after an order is created.
 *
 * A booking must not fail just because no worker is free — the order stays
 * PENDING and can be matched later (by retry, or by a worker accepting it
 * directly). So this never throws.
 */
export async function tryAutoMatch(
  order: OrderRecord,
  excludeWorkerIds: string[] = [],
): Promise<AssignResult> {
  try {
    return await assignWorkerToOrder({ order, excludeWorkerIds });
  } catch {
    return { ok: false, reason: "NO_WORKER_AVAILABLE" };
  }
}
