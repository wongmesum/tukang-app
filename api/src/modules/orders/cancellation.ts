import type { OrderStatus } from "./state-machine";

/**
 * Cancellation fee rules.
 *
 * Spec: "Terapkan aturan biaya pembatalan setelah tukang berangkat."
 *
 * The dividing line is departure. Before a worker leaves, cancelling costs
 * them nothing but time. Once they're on the road they've spent fuel and
 * turned down other jobs, so the fee compensates them — it is credited to the
 * worker's wallet, not kept by the platform.
 *
 * ⚠️ BUSINESS DECISION — these numbers are a defensible default, not an
 * approved policy. docs/07 lists the travel-cost split as still open. Confirm
 * before launch:
 *   - Should ACCEPTED (assigned but not departed) carry a small fee?
 *   - Is the full travel cost fair, or only the one-way portion?
 *   - Does the platform take any share of the fee?
 */

/** Statuses where the worker has not yet left for the customer. */
const NO_FEE_STATUSES: readonly OrderStatus[] = ["PENDING", "MATCHED", "ACCEPTED"];

/**
 * Fraction of the quoted travel cost charged once the worker is en route.
 * 1.0 = the whole trip allowance.
 */
const EN_ROUTE_TRAVEL_FEE_RATIO = 1.0;

export interface CancellationFeeInput {
  status: OrderStatus;
  /** Travel cost quoted at booking time. */
  travelCost: number;
}

export interface CancellationFeeResult {
  /** Rupiah the customer owes. Zero when cancelling is free. */
  fee: number;
  /** Portion of the fee credited to the worker. */
  workerCompensation: number;
  /** Indonesian explanation shown to the customer. */
  reason: string;
}

/**
 * Work out what cancelling costs at the order's current status.
 *
 * Pure function — no database, no clock. Easy to test against every status.
 */
export function calculateCancellationFee(
  input: CancellationFeeInput,
): CancellationFeeResult {
  const { status, travelCost } = input;

  if (NO_FEE_STATUSES.includes(status)) {
    return {
      fee: 0,
      workerCompensation: 0,
      reason: "Pembatalan gratis karena tukang belum berangkat",
    };
  }

  if (status === "EN_ROUTE") {
    const fee = Math.round(travelCost * EN_ROUTE_TRAVEL_FEE_RATIO);
    return {
      fee,
      // The whole fee goes to the worker — the platform takes nothing here.
      workerCompensation: fee,
      reason: "Tukang sudah berangkat, dikenakan biaya ongkos jalan",
    };
  }

  // Any other status either isn't cancellable (the state machine rejects it
  // before we get here) or represents work already underway, which should go
  // through the dispute flow instead of a plain cancellation.
  return {
    fee: 0,
    workerCompensation: 0,
    reason: "Tidak ada biaya pembatalan",
  };
}

export const CANCELLATION_RULES = {
  NO_FEE_STATUSES,
  EN_ROUTE_TRAVEL_FEE_RATIO,
} as const;
