import { describe, expect, it } from "vitest";
import { haversineKm } from "../src/modules/matching/distance";
import { rankCandidates } from "../src/modules/matching/matcher";
import type { WorkerProfileRecord } from "../src/modules/workers/types";

function makeWorker(overrides: Partial<WorkerProfileRecord>): WorkerProfileRecord {
  return {
    id: overrides.id ?? "profile-1",
    userId: overrides.userId ?? "worker-1",
    ktpNumber: "0000",
    ktpPhotoUrl: "",
    bio: null,
    workRadiusKm: overrides.workRadiusKm ?? 20,
    homeLocation: overrides.homeLocation ?? { lat: -7.4722, lng: 112.4336 },
    isAvailable: overrides.isAvailable ?? true,
    ratingAvg: overrides.ratingAvg ?? 4.5,
    totalOrders: overrides.totalOrders ?? 10,
    verifiedAt: new Date(),
    status: overrides.status ?? "active",
    skills: overrides.skills ?? ["AC"],
    createdAt: new Date(),
  };
}

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    const p = { lat: -7.47, lng: 112.43 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("returns roughly 1.11 km for 0.01 degree latitude difference", () => {
    const a = { lat: -7.47, lng: 112.43 };
    const b = { lat: -7.48, lng: 112.43 };
    const km = haversineKm(a, b);
    expect(km).toBeGreaterThan(1.1);
    expect(km).toBeLessThan(1.2);
  });
});

describe("rankCandidates", () => {
  const customerLocation = { lat: -7.4722, lng: 112.4336 };

  it("returns empty when no workers", () => {
    const result = rankCandidates({
      categoryCode: "AC",
      customerLocation,
      workers: [],
    });
    expect(result).toEqual([]);
  });

  it("excludes workers whose skill does not match", () => {
    const workers = [
      makeWorker({ userId: "w1", skills: ["BGN"] }),
      makeWorker({ userId: "w2", skills: ["AC"] }),
    ];
    const result = rankCandidates({ categoryCode: "AC", customerLocation, workers });
    expect(result.map((c) => c.workerId)).toEqual(["w2"]);
  });

  it("excludes workers who are unavailable or pending", () => {
    const workers = [
      makeWorker({ userId: "w1", skills: ["AC"], isAvailable: false }),
      makeWorker({ userId: "w2", skills: ["AC"], status: "pending" }),
      makeWorker({ userId: "w3", skills: ["AC"] }),
    ];
    const result = rankCandidates({ categoryCode: "AC", customerLocation, workers });
    expect(result.map((c) => c.workerId)).toEqual(["w3"]);
  });

  it("excludes workers outside their own service radius", () => {
    // Point ~50km east (roughly)
    const farLocation = { lat: -7.4722, lng: 112.9336 };
    const workers = [
      makeWorker({ userId: "close", homeLocation: customerLocation, workRadiusKm: 20 }),
      makeWorker({ userId: "far", homeLocation: farLocation, workRadiusKm: 5 }),
    ];
    const result = rankCandidates({ categoryCode: "AC", customerLocation, workers });
    expect(result.map((c) => c.workerId)).toEqual(["close"]);
  });

  it("ranks by distance ascending", () => {
    const workers = [
      makeWorker({
        userId: "far",
        homeLocation: { lat: -7.5, lng: 112.5 },
        workRadiusKm: 50,
      }),
      makeWorker({
        userId: "near",
        homeLocation: { lat: -7.473, lng: 112.434 },
        workRadiusKm: 50,
      }),
    ];
    const result = rankCandidates({ categoryCode: "AC", customerLocation, workers });
    expect(result[0]!.workerId).toBe("near");
    expect(result[1]!.workerId).toBe("far");
  });

  it("uses rating and experience as tiebreakers", () => {
    // Two workers at same location, differ only in rating/experience.
    const workers = [
      makeWorker({
        userId: "low-rating",
        homeLocation: customerLocation,
        ratingAvg: 4.0,
        totalOrders: 5,
      }),
      makeWorker({
        userId: "high-rating",
        homeLocation: customerLocation,
        ratingAvg: 4.9,
        totalOrders: 5,
      }),
    ];
    const result = rankCandidates({ categoryCode: "AC", customerLocation, workers });
    expect(result[0]!.workerId).toBe("high-rating");
  });

  it("caps at 10 candidates", () => {
    const workers = Array.from({ length: 15 }, (_, i) =>
      makeWorker({
        userId: `w${i}`,
        homeLocation: customerLocation,
        skills: ["AC"],
      }),
    );
    const result = rankCandidates({ categoryCode: "AC", customerLocation, workers });
    expect(result.length).toBe(10);
  });
});
