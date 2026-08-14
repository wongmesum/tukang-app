import { createHmac, timingSafeEqual } from "crypto";
import { Hono } from "hono";
import { adminMiddleware } from "../../shared/admin-middleware";
import { authMiddleware } from "../../shared/auth-middleware";
import { env } from "../../config/env";
import { paymentRepo } from "./repository";
import { orderRepo } from "../orders/repository";
import { transitionOrder } from "../orders/state-machine";
import { emitOrderStatusChanged } from "../realtime/events";
import { walletRepo } from "../workers/repository";

async function creditWorkerOnPayment(orderId: string) {
  const order = await orderRepo.findById(orderId);
  if (!order || !order.workerId) return;
  const amount = order.pricing.totalFinal ?? order.pricing.totalEstimate;
  await walletRepo.addTransaction(
    order.workerId,
    "credit",
    amount,
    `Pendapatan dari order ${order.orderNumber}`,
    order.id,
  );
}
import { createQrisSchema, simulatePaidSchema, webhookSchema } from "./schema";
import type { PaymentRecord } from "./types";

const QRIS_EXPIRY_MINUTES = 15;

function generateQrString(paymentId: string, amount: number): string {
  // Stub QRIS string — in production this comes from Midtrans/Xendit API
  return `000201010211${paymentId.slice(0, 12)}520400005303360${amount}6304ABCD`;
}

function generateQrImageUrl(paymentId: string): string {
  return `https://cdn.tukangndeso.id/qr/${paymentId}.png`;
}

function formatPayment(payment: PaymentRecord) {
  return {
    payment_id: payment.id,
    order_id: payment.orderId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    reference: payment.reference,
    qr_string: payment.qrString,
    qr_image_url: payment.qrImageUrl,
    expires_at: payment.expiresAt?.toISOString() ?? null,
    paid_at: payment.paidAt?.toISOString() ?? null,
    created_at: payment.createdAt.toISOString(),
  };
}

const paymentsRouter = new Hono();

// POST /payments/qris/create (requires auth — customer creates QRIS for their order)
paymentsRouter.post("/payments/qris/create", authMiddleware, async (context) => {
  const body = await context.req.json();
  const parsed = createQrisSchema.safeParse(body);

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

  const authUser = context.get("user");
  const order = await orderRepo.findById(parsed.data.order_id);

  if (!order || order.customerId !== authUser.userId) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Order tidak ditemukan" } },
      404,
    );
  }

  // Check if there's already a pending payment for this order
  const existingPayments = await paymentRepo.findByOrderId(order.id);
  const pendingPayment = existingPayments.find((p) => p.status === "pending");
  if (pendingPayment) {
    return context.json({ success: true, data: formatPayment(pendingPayment) });
  }

  const expiresAt = new Date(Date.now() + QRIS_EXPIRY_MINUTES * 60 * 1000);

  const payment = await paymentRepo.create({
    orderId: order.id,
    amount: order.pricing.totalFinal ?? order.pricing.totalEstimate,
    method: "qris",
    qrString: null, // filled below
    qrImageUrl: null,
    expiresAt,
  });

  // Generate QR after we have payment id
  const qrString = generateQrString(payment.id, payment.amount);
  const qrImageUrl = generateQrImageUrl(payment.id);
  const updated = await paymentRepo.markQrData(payment.id, qrString, qrImageUrl);

  return context.json({ success: true, data: formatPayment(updated) });
});

// GET /payments/:id/status (requires auth)
paymentsRouter.get("/payments/:id/status", authMiddleware, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID pembayaran wajib diisi" } },
      400,
    );
  }
  const payment = await paymentRepo.findById(id);

  if (!payment) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Pembayaran tidak ditemukan" } },
      404,
    );
  }

  return context.json({ success: true, data: formatPayment(payment) });
});

// POST /payments/webhook/qris (no auth — called by payment provider)
paymentsRouter.post("/payments/webhook/qris", async (context) => {
  const body = await context.req.json();
  const parsed = webhookSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Webhook payload tidak valid" } },
      400,
    );
  }

  // Webhook signature verification
  const { payment_id, status, reference, signature } = parsed.data;

  if (!signature || !env.QRIS_WEBHOOK_SECRET) {
    return context.json(
      { success: false, error: { code: "FORBIDDEN", message: "Signature missing" } },
      403,
    );
  }

  const payload = `${payment_id}:${status}:${reference}`;
  const expectedSignature = createHmac("sha256", env.QRIS_WEBHOOK_SECRET).update(payload).digest("hex");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return context.json(
      { success: false, error: { code: "FORBIDDEN", message: "Invalid signature" } },
      403,
    );
  }

  const payment = await paymentRepo.findById(payment_id);

  if (!payment) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Payment tidak ditemukan" } },
      404,
    );
  }

  // Idempotent: already paid → just return success
  if (payment.status === "paid") {
    return context.json({ success: true, data: formatPayment(payment) });
  }

  if (status === "paid") {
    const updated = await paymentRepo.markPaid(payment_id, reference);

    // Transition order to PAID and credit worker wallet
    const order = await orderRepo.findById(payment.orderId);
    if (order && order.status === "COMPLETED") {
      const nextStatus = transitionOrder(order.status, "PAID");
      await orderRepo.update(order.id, { status: nextStatus });
      await creditWorkerOnPayment(order.id);
      emitOrderStatusChanged({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: nextStatus,
        customerId: order.customerId,
        workerId: order.workerId,
      });
    }

    return context.json({ success: true, data: formatPayment(updated) });
  }

  return context.json({ success: true, data: formatPayment(payment) });
});

// POST /payments/simulate-paid (dev only — simulate payment completion)
paymentsRouter.post("/payments/simulate-paid", authMiddleware, async (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }

  const body = await context.req.json();
  const parsed = simulatePaidSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Input tidak valid" } },
      400,
    );
  }

  const payment = await paymentRepo.findById(parsed.data.payment_id);
  if (!payment) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Payment tidak ditemukan" } },
      404,
    );
  }

  if (payment.status === "paid") {
    return context.json({ success: true, data: formatPayment(payment) });
  }

  const updated = await paymentRepo.markPaid(payment.id, `DEV-SIM-${Date.now()}`);

  // Transition order to PAID and credit worker wallet
  const order = await orderRepo.findById(payment.orderId);
  if (order && order.status === "COMPLETED") {
    const nextStatus = transitionOrder(order.status, "PAID");
    await orderRepo.update(order.id, { status: nextStatus });
    await creditWorkerOnPayment(order.id);
    emitOrderStatusChanged({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: nextStatus,
      customerId: order.customerId,
      workerId: order.workerId,
    });
  }

  return context.json({ success: true, data: formatPayment(updated) });
});

// POST /payments/:id/refund (admin only)
paymentsRouter.post("/payments/:id/refund", adminMiddleware, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "ID pembayaran wajib diisi" } },
      400,
    );
  }
  const payment = await paymentRepo.findById(id);

  if (!payment) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Payment tidak ditemukan" } },
      404,
    );
  }

  if (payment.status !== "paid") {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "Hanya pembayaran yang sudah lunas bisa di-refund" } },
      409,
    );
  }

  const updated = await paymentRepo.markRefunded(id);
  return context.json({ success: true, data: formatPayment(updated) });
});

export { paymentsRouter };
