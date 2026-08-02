import { describe, expect, it } from "vitest";
import {
  PricingOutOfServiceAreaError,
  calculatePricing,
} from "../src/modules/pricing/calculator";

describe("calculatePricing", () => {
  it("calculates hourly pricing for normal daytime order", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 3,
      distanceKm: 12,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.baseRate).toBe(90000);
    expect(result.travelCost).toBe(12000);
    expect(result.totalEstimate).toBe(102000);
  });

  it("enforces minimum 2 hours for hourly jobs", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 1,
      distanceKm: 5,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.baseRate).toBe(60000);
  });

  it("calculates daily pricing", () => {
    const result = calculatePricing({
      pricingScheme: "daily",
      duration: 2,
      distanceKm: 8,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.baseRate).toBe(300000);
    expect(result.travelCost).toBe(8000);
    expect(result.totalEstimate).toBe(308000);
  });

  it("applies minimum travel cost", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 2,
      distanceKm: 2,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.travelCost).toBe(5000);
  });

  it("applies maximum travel cost cap within allowed area", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 2,
      distanceKm: 25,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.travelCost).toBe(25000);
  });

  it("throws for orders outside Mojokerto service radius", () => {
    expect(() =>
      calculatePricing({
        pricingScheme: "hourly",
        duration: 2,
        distanceKm: 26,
        floorLevel: 1,
        isUrgent: false,
        scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
        isNationalHoliday: false,
      }),
    ).toThrow(PricingOutOfServiceAreaError);
  });

  it("applies night surcharge", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 3,
      distanceKm: 12,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T20:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.surcharges.night).toBe(27000);
    expect(result.totalEstimate).toBe(129000);
  });

  it("applies weekend surcharge", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 2,
      distanceKm: 10,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-08-01T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.surcharges.weekend).toBe(12000);
    expect(result.totalEstimate).toBe(82000);
  });

  it("applies national holiday surcharge", () => {
    const result = calculatePricing({
      pricingScheme: "daily",
      duration: 1,
      distanceKm: 10,
      floorLevel: 1,
      isUrgent: false,
      scheduledAt: new Date("2026-08-17T10:00:00+07:00"),
      isNationalHoliday: true,
    });

    expect(result.surcharges.holiday).toBe(75000);
    expect(result.totalEstimate).toBe(235000);
  });

  it("applies urgent surcharge", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 2,
      distanceKm: 10,
      floorLevel: 1,
      isUrgent: true,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.surcharges.urgent).toBe(25000);
    expect(result.totalEstimate).toBe(95000);
  });

  it("applies floor surcharge for floors above 3", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 2,
      distanceKm: 10,
      floorLevel: 5,
      isUrgent: false,
      scheduledAt: new Date("2026-07-30T10:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.surcharges.floor).toBe(20000);
    expect(result.totalEstimate).toBe(90000);
  });

  it("combines multiple surcharges", () => {
    const result = calculatePricing({
      pricingScheme: "hourly",
      duration: 3,
      distanceKm: 10,
      floorLevel: 5,
      isUrgent: true,
      scheduledAt: new Date("2026-08-01T20:00:00+07:00"),
      isNationalHoliday: false,
    });

    expect(result.baseRate).toBe(90000);
    expect(result.surcharges.night).toBe(27000);
    expect(result.surcharges.weekend).toBe(18000);
    expect(result.surcharges.urgent).toBe(25000);
    expect(result.surcharges.floor).toBe(20000);
    expect(result.totalEstimate).toBe(190000);
  });
});
