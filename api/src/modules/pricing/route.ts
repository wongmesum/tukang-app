import { Hono } from "hono";
import { calculatePricing, PricingOutOfServiceAreaError } from "./calculator";
import { pricingEstimateSchema } from "./schema";
import { haversineKm } from "../matching/distance";
import { isNationalHoliday } from "./holidays";

// Mojokerto Kabupaten center as reference point for distance estimation.
// When a worker is already assigned, the actual worker location should be used.
// For pricing estimates (before matching), we use center of service area.
const SERVICE_AREA_CENTER = { lat: -7.4724, lng: 112.4341 };

function computeDistanceKm(
  customerLat: number,
  customerLng: number,
): number {
  const distance = haversineKm(
    { lat: customerLat, lng: customerLng },
    SERVICE_AREA_CENTER,
  );
  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}

const pricingRouter = new Hono();

pricingRouter.post("/estimate", async (context) => {
  const body = await context.req.json();
  const parsed = pricingEstimateSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const data = parsed.data;
  const distanceKm = computeDistanceKm(
    data.customer_location.lat,
    data.customer_location.lng,
  );

  const scheduledAt = data.scheduled_at
    ? new Date(data.scheduled_at)
    : new Date();

  try {
    const result = calculatePricing({
      pricingScheme: data.pricing_scheme,
      duration: data.duration,
      distanceKm,
      floorLevel: data.floor_level,
      isUrgent: data.is_urgent,
      scheduledAt,
      isNationalHoliday: isNationalHoliday(scheduledAt),
    });

    const breakdownParts: string[] = [];
    if (data.pricing_scheme === "hourly") {
      breakdownParts.push(`Tarif ${data.duration} jam × Rp30.000`);
    } else {
      breakdownParts.push(`Tarif ${data.duration} hari × Rp150.000`);
    }
    breakdownParts.push(`Ongkos ${distanceKm} km`);
    if (result.surcharges.night > 0) breakdownParts.push("Malam +30%");
    if (result.surcharges.weekend > 0) breakdownParts.push("Weekend +20%");
    if (result.surcharges.holiday > 0) breakdownParts.push("Libur +50%");
    if (result.surcharges.urgent > 0) breakdownParts.push("Urgent +Rp25.000");
    if (result.surcharges.floor > 0) breakdownParts.push(`Lantai +Rp${result.surcharges.floor.toLocaleString("id-ID")}`);

    return context.json({
      success: true,
      data: {
        base_rate: result.baseRate,
        distance_km: distanceKm,
        travel_cost: result.travelCost,
        surcharge: result.surcharges,
        total_estimate: result.totalEstimate,
        breakdown_text: breakdownParts.join(" + "),
      },
    });
  } catch (error) {
    if (error instanceof PricingOutOfServiceAreaError) {
      return context.json(
        {
          success: false,
          error: {
            code: "OUT_OF_SERVICE_AREA",
            message: error.message,
          },
        },
        422,
      );
    }
    throw error;
  }
});

export { pricingRouter };
