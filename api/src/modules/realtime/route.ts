import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { requireRole } from "../../shared/role-middleware";
import { hub } from "./hub";
import { orderRepo } from "../orders/repository";
import { emitWorkerLocationUpdate } from "./events";
import { z } from "zod";

const realtimeRouter = new Hono();

// GET /realtime/status — monitor connection count (admin/dev)
realtimeRouter.get("/realtime/status", async (context) => {
  return context.json({
    success: true,
    data: {
      total_connections: hub.totalConnections,
      total_users: hub.totalUsers,
    },
  });
});

const locationUpdateSchema = z.object({
  order_id: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// POST /realtime/location — fallback for worker location update via REST
realtimeRouter.post("/realtime/location", authMiddleware, requireRole("worker"), async (context) => {
  const body = await context.req.json();
  const parsed = locationUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Input tidak valid" } },
      400,
    );
  }

  const authUser = context.get("user");
  const { order_id, lat, lng } = parsed.data;

  const order = await orderRepo.findById(order_id);
  if (!order || order.workerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  if (order.status !== "EN_ROUTE") {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Location update hanya tersedia saat status EN_ROUTE" } },
      409,
    );
  }

  emitWorkerLocationUpdate(order.customerId, {
    order_id,
    worker_id: authUser.userId,
    location: { lat, lng },
  });

  return context.json({ success: true, data: { sent: true } });
});

export { realtimeRouter };
