export type OrderStatus =
  | "PENDING"
  | "MATCHED"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAID"
  | "REVIEWED"
  | "EXPIRED"
  | "CANCELLED_BY_CUSTOMER"
  | "CANCELLED_BY_WORKER"
  | "DISPUTED";

export class InvalidTransitionError extends Error {
  public constructor(from: OrderStatus, to: OrderStatus) {
    super(`Transisi status tidak diizinkan: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

// Allowed transitions map — see docs/02-user-flows.md
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["MATCHED", "EXPIRED", "CANCELLED_BY_CUSTOMER"],
  MATCHED: ["ACCEPTED", "EXPIRED", "CANCELLED_BY_CUSTOMER"],
  ACCEPTED: ["EN_ROUTE", "CANCELLED_BY_WORKER", "CANCELLED_BY_CUSTOMER"],
  EN_ROUTE: ["ARRIVED", "CANCELLED_BY_WORKER", "CANCELLED_BY_CUSTOMER"],
  ARRIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["PAID", "DISPUTED"],
  PAID: ["REVIEWED", "DISPUTED"],
  REVIEWED: [],
  EXPIRED: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_WORKER: [],
  DISPUTED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionOrder(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
  return to;
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
