import { Hono } from "hono";
import { serviceRepo } from "./repository";

const servicesRouter = new Hono();

servicesRouter.get("/categories", async (context) => {
  const active = await serviceRepo.findCategories();
  return context.json({ success: true, data: active.map(c => ({
    code: c.code,
    name: c.name,
    icon_url: c.iconUrl,
    is_active: c.isActive,
  })) });
});

servicesRouter.get("/categories/:code/services", async (context) => {
  const code = context.req.param("code")?.toUpperCase();
  if (!code) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Code wajib diisi" } },
      400,
    );
  }

  const category = await serviceRepo.findCategoryByCode(code);

  if (!category) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan" } },
      404,
    );
  }

  const items = await serviceRepo.findServicesByCategory(code);
  return context.json({ success: true, data: items.map(s => ({
    id: s.id,
    category_code: s.categoryCode,
    name: s.name,
    description: s.description,
    base_hourly_rate: s.baseHourlyRate,
    base_daily_rate: s.baseDailyRate,
    min_hours: s.minHours,
    is_active: s.isActive,
  })) });
});

servicesRouter.get("/services/:id", async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID wajib diisi" } },
      400,
    );
  }

  const service = await serviceRepo.findServiceById(id);

  if (!service) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Layanan tidak ditemukan" } },
      404,
    );
  }

  return context.json({ success: true, data: {
    id: service.id,
    category_code: service.categoryCode,
    name: service.name,
    description: service.description,
    base_hourly_rate: service.baseHourlyRate,
    base_daily_rate: service.baseDailyRate,
    min_hours: service.minHours,
    is_active: service.isActive,
  } });
});

export { servicesRouter };
