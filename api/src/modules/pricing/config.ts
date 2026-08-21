/**
 * Global pricing configuration.
 * In production, these values should be stored in the database.
 * For now we use an in-memory mutable config that can be updated via admin API.
 */

export interface PricingConfig {
  hourlyRate: number;
  dailyRate: number;
  minHours: number;
  costPerKm: number;
  minTravelCost: number;
  maxTravelCost: number;
  maxServiceRadiusKm: number;
  surchargeHolidayPercent: number;
  surchargeNightPercent: number;
  surchargeWeekendPercent: number;
  surchargeUrgentFlat: number;
  surchargeFloorPerLevel: number;
  surchargeFloorThreshold: number;
  nightStartHour: number;
  nightEndHour: number;
}

// Default config matching the spec
const DEFAULT_CONFIG: PricingConfig = {
  hourlyRate: 30000,
  dailyRate: 150000,
  minHours: 2,
  costPerKm: 1000,
  minTravelCost: 5000,
  maxTravelCost: 50000,
  maxServiceRadiusKm: 25,
  surchargeHolidayPercent: 0.5,
  surchargeNightPercent: 0.3,
  surchargeWeekendPercent: 0.2,
  surchargeUrgentFlat: 25000,
  surchargeFloorPerLevel: 10000,
  surchargeFloorThreshold: 3,
  nightStartHour: 18,
  nightEndHour: 6,
};

// Mutable global config
let currentConfig: PricingConfig = { ...DEFAULT_CONFIG };

export function getPricingConfig(): PricingConfig {
  return { ...currentConfig };
}

export function updatePricingConfig(patch: Partial<PricingConfig>): PricingConfig {
  currentConfig = { ...currentConfig, ...patch };
  return { ...currentConfig };
}

export function resetPricingConfig(): PricingConfig {
  currentConfig = { ...DEFAULT_CONFIG };
  return { ...currentConfig };
}
