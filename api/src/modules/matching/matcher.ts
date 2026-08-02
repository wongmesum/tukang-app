import { haversineKm } from "./distance";
import type { WorkerProfileRecord } from "../workers/types";

export interface MatchingContext {
  categoryCode: string;
  customerLocation: { lat: number; lng: number };
  workers: WorkerProfileRecord[];
}

export interface MatchCandidate {
  workerId: string;
  distanceKm: number;
  ratingAvg: number;
  totalOrders: number;
}

const MAX_CANDIDATES = 10;

/**
 * Rank eligible workers for an order.
 *
 * Rules:
 * 1. Worker must be `active` and `is_available = true`.
 * 2. Worker skill list must include the order's category code.
 * 3. Distance customer↔worker must be within worker's `workRadiusKm`.
 * 4. Sort by: distance ASC, then rating DESC, then experience DESC.
 * 5. Return top N candidates.
 */
export function rankCandidates(context: MatchingContext): MatchCandidate[] {
  const eligible: MatchCandidate[] = [];

  for (const worker of context.workers) {
    if (worker.status !== "active") continue;
    if (!worker.isAvailable) continue;
    if (!worker.skills.includes(context.categoryCode)) continue;

    const distanceKm = haversineKm(context.customerLocation, worker.homeLocation);
    if (distanceKm > worker.workRadiusKm) continue;

    eligible.push({
      workerId: worker.userId,
      distanceKm: Math.round(distanceKm * 10) / 10,
      ratingAvg: worker.ratingAvg,
      totalOrders: worker.totalOrders,
    });
  }

  eligible.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (a.ratingAvg !== b.ratingAvg) return b.ratingAvg - a.ratingAvg;
    return b.totalOrders - a.totalOrders;
  });

  return eligible.slice(0, MAX_CANDIDATES);
}
