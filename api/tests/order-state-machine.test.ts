import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  canTransition,
  transitionOrder,
  type OrderStatus,
} from "../src/modules/orders/state-machine";

describe("order state machine", () => {
  it("allows PENDING → MATCHED", () => {
    expect(canTransition("PENDING", "MATCHED")).toBe(true);
    expect(transitionOrder("PENDING", "MATCHED")).toBe("MATCHED");
  });

  it("allows MATCHED → ACCEPTED", () => {
    expect(canTransition("MATCHED", "ACCEPTED")).toBe(true);
  });

  it("allows ACCEPTED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED → PAID → REVIEWED", () => {
    const steps: OrderStatus[] = [
      "ACCEPTED",
      "EN_ROUTE",
      "ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
      "PAID",
      "REVIEWED",
    ];
    for (let i = 0; i < steps.length - 1; i += 1) {
      const from = steps[i]!;
      const to = steps[i + 1]!;
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it("rejects illegal transition PENDING → COMPLETED", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(() => transitionOrder("PENDING", "COMPLETED")).toThrow(InvalidTransitionError);
  });

  it("allows customer cancellation from PENDING/MATCHED", () => {
    expect(canTransition("PENDING", "CANCELLED_BY_CUSTOMER")).toBe(true);
    expect(canTransition("MATCHED", "CANCELLED_BY_CUSTOMER")).toBe(true);
  });

  it("rejects customer cancellation after IN_PROGRESS", () => {
    expect(canTransition("IN_PROGRESS", "CANCELLED_BY_CUSTOMER")).toBe(false);
  });

  it("allows worker cancellation from ACCEPTED/EN_ROUTE", () => {
    expect(canTransition("ACCEPTED", "CANCELLED_BY_WORKER")).toBe(true);
    expect(canTransition("EN_ROUTE", "CANCELLED_BY_WORKER")).toBe(true);
  });

  it("rejects worker cancellation after ARRIVED", () => {
    expect(canTransition("ARRIVED", "CANCELLED_BY_WORKER")).toBe(false);
  });

  it("allows dispute from IN_PROGRESS or COMPLETED", () => {
    expect(canTransition("IN_PROGRESS", "DISPUTED")).toBe(true);
    expect(canTransition("COMPLETED", "DISPUTED")).toBe(true);
  });

  it("terminates on REVIEWED, EXPIRED, CANCELLED_*, DISPUTED", () => {
    expect(canTransition("REVIEWED", "PENDING")).toBe(false);
    expect(canTransition("EXPIRED", "PENDING")).toBe(false);
    expect(canTransition("CANCELLED_BY_CUSTOMER", "PENDING")).toBe(false);
    expect(canTransition("DISPUTED", "COMPLETED")).toBe(false);
  });
});
