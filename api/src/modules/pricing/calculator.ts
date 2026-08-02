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

// --- Constants (named, no magic numbers) ---

const HOURLY_RATE = 30000;
const DAILY_RATE = 150000;
const MIN_HOURS = 2;
const COST_PER_KM = 1000;
const MIN_TRAVEL_COST = 5000;
const MAX_TRAVEL_COST = 50000;
const MAX_SERVICE_RADIUS_KM = 25;

const SURCHARGE_HOLIDAY_PERCENT = 0.5;
const SURCHARGE_NIGHT_PERCENT = 0.3;
const SURCHARGE_WEEKEND_PERCENT = 0.2;
const SURCHARGE_URGENT_FLAT = 25000;
const SURCHARGE_FLOOR_PER_LEVEL = 10000;
const SURCHARGE_FLOOR_THRESHOLD = 3;

const WIB_OFFSET_HOURS = 7;
const NIGHT_START_HOUR = 18;
const NIGHT_END_HOUR = 6;

// --- Helpers ---

function getWibHour(date: Date): number {
  const utcHour = date.getUTCHours();
  return (utcHour + WIB_OFFSET_HOURS) % 24;
}

function getWibDay(date: Date): number {
  // Shift to WIB then get day of week (0=Sun, 6=Sat)
  const shifted = new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.getUTCDay();
}

function isNightHour(date: Date): boolean {
  const hour = getWibHour(date);
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

function isWeekend(date: Date): boolean {
  const day = getWibDay(date);
  return day === 0 || day === 6;
}

// --- Main Calculator ---

export function calculatePricing(input: CalculatePricingInput): PricingResult {
  const { pricingScheme, duration, distanceKm, floorLevel, isUrgent, scheduledAt, isNationalHoliday } = input;

  // Validate service area
  if (distanceKm > MAX_SERVICE_RADIUS_KM) {
    throw new PricingOutOfServiceAreaError(
      `Jarak ${distanceKm} km melebihi radius layanan ${MAX_SERVICE_RADIUS_KM} km`,
    );
  }

  // Base rate
  const effectiveDuration = pricingScheme === "hourly"
    ? Math.max(duration, MIN_HOURS)
    : duration;

  const rate = pricingScheme === "hourly" ? HOURLY_RATE : DAILY_RATE;
  const baseRate = effectiveDuration * rate;

  // Travel cost
  const rawTravelCost = Math.round(distanceKm * COST_PER_KM);
  const travelCost = Math.min(Math.max(rawTravelCost, MIN_TRAVEL_COST), MAX_TRAVEL_COST);

  // Surcharges (all percentage-based are on baseRate)
  const holidaySurcharge = isNationalHoliday
    ? Math.round(baseRate * SURCHARGE_HOLIDAY_PERCENT)
    : 0;

  const nightSurcharge = isNightHour(scheduledAt)
    ? Math.round(baseRate * SURCHARGE_NIGHT_PERCENT)
    : 0;

  const weekendSurcharge = isWeekend(scheduledAt)
    ? Math.round(baseRate * SURCHARGE_WEEKEND_PERCENT)
    : 0;

  const urgentSurcharge = isUrgent ? SURCHARGE_URGENT_FLAT : 0;

  const floorsAboveThreshold = Math.max(0, floorLevel - SURCHARGE_FLOOR_THRESHOLD);
  const floorSurcharge = floorsAboveThreshold * SURCHARGE_FLOOR_PER_LEVEL;

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
