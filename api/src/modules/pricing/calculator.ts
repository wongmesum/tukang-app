import { getPricingConfig } from "./config";

export class PricingOutOfServiceAreaError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PricingOutOfServiceAreaError";
  }
}

export interface CalculatePricingInput {
  pricingScheme: "hourly" | "daily";
  duration: number;
  distanceKm: number;
  floorLevel: number;
  isUrgent: boolean;
  scheduledAt: Date;
  isNationalHoliday: boolean;
}

export interface PricingResult {
  baseRate: number;
  travelCost: number;
  totalEstimate: number;
  surcharges: {
    holiday: number;
    night: number;
    weekend: number;
    urgent: number;
    floor: number;
  };
}

const WIB_OFFSET_HOURS = 7;

// --- Helpers ---

function getWibHour(date: Date): number {
  const utcHour = date.getUTCHours();
  return (utcHour + WIB_OFFSET_HOURS) % 24;
}

function getWibDay(date: Date): number {
  const shifted = new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.getUTCDay();
}

function isNightHour(date: Date, startHour: number, endHour: number): boolean {
  const hour = getWibHour(date);
  return hour >= startHour || hour < endHour;
}

function isWeekend(date: Date): boolean {
  const day = getWibDay(date);
  return day === 0 || day === 6;
}

// --- Main Calculator ---

export function calculatePricing(input: CalculatePricingInput): PricingResult {
  const { pricingScheme, duration, distanceKm, floorLevel, isUrgent, scheduledAt, isNationalHoliday } = input;
  const config = getPricingConfig();

  // Validate service area
  if (distanceKm > config.maxServiceRadiusKm) {
    throw new PricingOutOfServiceAreaError(
      `Jarak ${distanceKm} km melebihi radius layanan ${config.maxServiceRadiusKm} km`,
    );
  }

  // Base rate
  const effectiveDuration = pricingScheme === "hourly"
    ? Math.max(duration, config.minHours)
    : duration;

  const rate = pricingScheme === "hourly" ? config.hourlyRate : config.dailyRate;
  const baseRate = effectiveDuration * rate;

  // Travel cost
  const rawTravelCost = Math.round(distanceKm * config.costPerKm);
  const travelCost = Math.min(Math.max(rawTravelCost, config.minTravelCost), config.maxTravelCost);

  // Surcharges (all percentage-based are on baseRate)
  const holidaySurcharge = isNationalHoliday
    ? Math.round(baseRate * config.surchargeHolidayPercent)
    : 0;

  const nightSurcharge = isNightHour(scheduledAt, config.nightStartHour, config.nightEndHour)
    ? Math.round(baseRate * config.surchargeNightPercent)
    : 0;

  const weekendSurcharge = isWeekend(scheduledAt)
    ? Math.round(baseRate * config.surchargeWeekendPercent)
    : 0;

  const urgentSurcharge = isUrgent ? config.surchargeUrgentFlat : 0;

  const floorsAboveThreshold = Math.max(0, floorLevel - config.surchargeFloorThreshold);
  const floorSurcharge = floorsAboveThreshold * config.surchargeFloorPerLevel;

  // Total
  const totalEstimate =
    baseRate +
    travelCost +
    holidaySurcharge +
    nightSurcharge +
    weekendSurcharge +
    urgentSurcharge +
    floorSurcharge;

  return {
    baseRate,
    travelCost,
    totalEstimate,
    surcharges: {
      holiday: holidaySurcharge,
      night: nightSurcharge,
      weekend: weekendSurcharge,
      urgent: urgentSurcharge,
      floor: floorSurcharge,
    },
  };
}
