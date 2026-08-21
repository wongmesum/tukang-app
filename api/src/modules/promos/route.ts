import { Hono } from "hono";
import { randomUUID } from "crypto";
import { z } from "zod";
import { authMiddleware } from "../../shared/auth-middleware";
import { adminMiddleware } from "../../shared/admin-middleware";

// --- Types ---
interface Promo {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: number; // percentage (0-100) or flat amount in Rupiah
  minOrderAmount: number;
  maxDiscount: number | null; // cap for percentage discount
  usageLimit: number; // total allowed uses
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  description: string;
  createdAt: Date;
}

// In-memory store
const promos = new Map<string, Promo>();

// Seed some default promos
const seedPromo: Promo = {
  id: "promo-launch-001",
  code: "LAUNCH50",
  type: "percentage",
  value: 50,
  minOrderAmount: 60000,
  maxDiscount: 50000,
  usageLimit: 100,
  usedCount: 0,
  validFrom: new Date("2026-07-01"),
  validUntil: new Date("2026-12-31"),
  isActive: true,
  description: "Diskon 50% (maks Rp50.000) untuk pelanggan baru",
  createdAt: new Date("2026-07-01"),
};
promos.set(seedPromo.id, seedPromo);

const seedPromo2: Promo = {
  id: "promo-flat-001",
  code: "GRATISFIRST",
  type: "flat",
  value: 30000,
  minOrderAmount: 0,
  maxDiscount: null,
  usageLimit: 50,
  usedCount: 0,
  validFrom: new Date("2026-07-01"),
  validUntil: new Date("2026-12-31"),
  isActive: true,
  description: "Potongan Rp30.000 untuk order pertama",
  createdAt: new Date("2026-07-01"),
};
promos.set(seedPromo2.id, seedPromo2);

// Track usage per user
const userPromoUsage = new Map<string, Set<string>>(); // userId → Set<promoId>

function hasUserUsed(userId: string, promoId: string): boolean {
  return userPromoUsage.get(userId)?.has(promoId) ?? false;
}

function markUsed(userId: string, promoId: string): void {
  if (!userPromoUsage.has(userId)) userPromoUsage.set(userId, new Set());
  userPromoUsage.get(userId)!.add(promoId);
}

// --- Schemas ---
const createPromoSchema = z.object({
  code: z.string().min(3).max(20),
  type: z.enum(["percentage", "flat"]),
  value: z.number().positive(),
  min_order_amount: z.number().nonnegative().default(0),
  max_discount: z.number().positive().nullable().optional(),
  usage_limit: z.number().int().positive(),
  valid_from: z.string().datetime({ offset: true }),
  valid_until: z.string().datetime({ offset: true }),
  description: z.string().max(200),
});

function formatPromo(p: Promo) {
  return {
    id: p.id,
    code: p.code,
    type: p.type,
    value: p.value,
    min_order_amount: p.minOrderAmount,
    max_discount: p.maxDiscount,
    usage_limit: p.usageLimit,
    used_count: p.usedCount,
    valid_from: p.validFrom.toISOString(),
    valid_until: p.validUntil.toISOString(),
    is_active: p.isActive,
    description: p.description,
  };
}

// --- Routes ---
const promosRouter = new Hono();

// POST /promos/apply — customer applies a promo code to get discount
promosRouter.post("/promos/apply", authMiddleware, async (context) => {
  const authUser = context.get("user");
  const body = await context.req.json() as { code?: string; order_amount?: number };

  if (!body.code) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Kode promo wajib diisi" } },
      400,
    );
  }

  const orderAmount = body.order_amount ?? 0;

  // Find promo by code
  let promo: Promo | undefined;
  for (const p of promos.values()) {
    if (p.code === body.code.toUpperCase()) {
      promo = p;
      break;
    }
  }

  if (!promo) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kode promo tidak ditemukan" } },
      404,
    );
  }

  // Validate
  const now = new Date();
  if (!promo.isActive) {
    return context.json({ success: false, error: { code: "CONFLICT", message: "Promo sudah tidak aktif" } }, 409);
  }
  if (now < promo.validFrom || now > promo.validUntil) {
    return context.json({ success: false, error: { code: "CONFLICT", message: "Promo sudah expired atau belum berlaku" } }, 409);
  }
  if (promo.usedCount >= promo.usageLimit) {
    return context.json({ success: false, error: { code: "CONFLICT", message: "Kuota promo sudah habis" } }, 409);
  }
  if (hasUserUsed(authUser.userId, promo.id)) {
    return context.json({ success: false, error: { code: "CONFLICT", message: "Anda sudah menggunakan promo ini" } }, 409);
  }
  if (orderAmount < promo.minOrderAmount) {
    return context.json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: `Minimum order Rp ${promo.minOrderAmount.toLocaleString("id-ID")} untuk promo ini` },
    }, 400);
  }

  // Calculate discount
  let discount: number;
  if (promo.type === "percentage") {
    discount = Math.round(orderAmount * (promo.value / 100));
    if (promo.maxDiscount !== null) {
      discount = Math.min(discount, promo.maxDiscount);
    }
  } else {
    discount = promo.value;
  }

  // Don't exceed order amount
  discount = Math.min(discount, orderAmount);

  return context.json({
    success: true,
    data: {
      promo_id: promo.id,
      code: promo.code,
      discount,
      final_amount: orderAmount - discount,
      description: promo.description,
    },
  });
});

// POST /promos/redeem — confirm promo usage (called after order is placed)
promosRouter.post("/promos/redeem", authMiddleware, async (context) => {
  const authUser = context.get("user");
  const body = await context.req.json() as { promo_id?: string };

  if (!body.promo_id) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "promo_id wajib diisi" } }, 400);
  }

  const promo = promos.get(body.promo_id);
  if (!promo) {
    return context.json({ success: false, error: { code: "NOT_FOUND", message: "Promo tidak ditemukan" } }, 404);
  }

  markUsed(authUser.userId, promo.id);
  promo.usedCount += 1;

  return context.json({ success: true, data: { redeemed: true } });
});

// GET /promos/available — list promos available to the user
promosRouter.get("/promos/available", authMiddleware, async (context) => {
  const authUser = context.get("user");
  const now = new Date();
  const available: Promo[] = [];

  for (const p of promos.values()) {
    if (!p.isActive) continue;
    if (now < p.validFrom || now > p.validUntil) continue;
    if (p.usedCount >= p.usageLimit) continue;
    if (hasUserUsed(authUser.userId, p.id)) continue;
    available.push(p);
  }

  return context.json({
    success: true,
    data: available.map(formatPromo),
  });
});

// --- Admin routes ---

// GET /admin/promos — all promos
promosRouter.get("/admin/promos", adminMiddleware, async (context) => {
  return context.json({
    success: true,
    data: [...promos.values()].map(formatPromo),
  });
});

// POST /admin/promos — create promo
promosRouter.post("/admin/promos", adminMiddleware, async (context) => {
  const body = await context.req.json();
  const parsed = createPromoSchema.safeParse(body);

  if (!parsed.success) {
    return context.json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Input tidak valid", details: parsed.error.flatten().fieldErrors },
    }, 400);
  }

  const data = parsed.data;
  const promo: Promo = {
    id: randomUUID(),
    code: data.code.toUpperCase(),
    type: data.type,
    value: data.value,
    minOrderAmount: data.min_order_amount,
    maxDiscount: data.max_discount ?? null,
    usageLimit: data.usage_limit,
    usedCount: 0,
    validFrom: new Date(data.valid_from),
    validUntil: new Date(data.valid_until),
    isActive: true,
    description: data.description,
    createdAt: new Date(),
  };

  promos.set(promo.id, promo);
  return context.json({ success: true, data: formatPromo(promo) });
});

// PATCH /admin/promos/:id — toggle active or update
promosRouter.patch("/admin/promos/:id", adminMiddleware, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "ID wajib diisi" } }, 400);
  }
  const promo = promos.get(id);
  if (!promo) {
    return context.json({ success: false, error: { code: "NOT_FOUND", message: "Promo tidak ditemukan" } }, 404);
  }

  const body = await context.req.json() as { is_active?: boolean; usage_limit?: number; valid_until?: string };
  if (body.is_active !== undefined) promo.isActive = body.is_active;
  if (body.usage_limit !== undefined) promo.usageLimit = body.usage_limit;
  if (body.valid_until) promo.validUntil = new Date(body.valid_until);

  return context.json({ success: true, data: formatPromo(promo) });
});

export { promosRouter };
