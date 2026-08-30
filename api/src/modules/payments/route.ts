import { createHash, createHmac, timingSafeEqual } from "crypto";
import { Hono } from "hono";
import { adminMiddleware } from "../../shared/admin-middleware";
import { authMiddleware } from "../../shared/auth-middleware";
import { env } from "../../config/env";
import { paymentRepo } from "./repository";
import { orderRepo } from "../orders/repository";
import { transitionOrder } from "../orders/state-machine";
import { walletRepo } from "../workers/repository";
import { sendOrderNotification } from "../notifications/order-notifications";
import type { OrderStatus } from "../orders/state-machine";

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
import { createQrisSchema, midtransWebhookSchema, simulatePaidSchema, webhookSchema } from "./schema";
import { getPaymentProvider } from "./providers";
import type { PaymentRecord } from "./types";

const QRIS_EXPIRY_MINUTES = 15;

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

  // Check if there's already a pending (non-expired) payment for this order
  const existingPayments = await paymentRepo.findByOrderId(order.id);
  const pendingPayment = existingPayments.find(
    (p) => p.status === "pending" && (!p.expiresAt || p.expiresAt.getTime() > Date.now()),
  );
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

  // Generate QR via payment provider (Midtrans or stub)
  const provider = getPaymentProvider();
  const qrResult = await provider.createQris({
    paymentId: payment.id,
    amount: payment.amount,
    orderId: order.id,
    description: `Order ${order.orderNumber ?? order.id}`,
    expiryMinutes: QRIS_EXPIRY_MINUTES,
  });
  const updated = await paymentRepo.markQrData(payment.id, qrResult.qrString, qrResult.qrImageUrl);

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

  // Check if payment has expired
  const isExpired = payment.status === "pending" && payment.expiresAt && payment.expiresAt.getTime() < Date.now();
  const responseData = {
    ...formatPayment(payment),
    is_expired: isExpired,
  };

  return context.json({ success: true, data: responseData });
});

// POST /payments/webhook/qris (no auth — called by payment provider)
paymentsRouter.post("/payments/webhook/qris", async (context) => {
  const body = await context.req.json();

  let paymentId: string;
  let status: "paid" | "expired" | "failed" | "pending";
  let reference: string;

  const midtransParsed = midtransWebhookSchema.safeParse(body);
  if (midtransParsed.success) {
    const notification = midtransParsed.data;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return context.json(
        { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Midtrans belum dikonfigurasi" } },
        503,
      );
    }

    const signaturePayload =
      notification.order_id +
      notification.status_code +
      notification.gross_amount +
      serverKey;
    const expectedSignature = createHash("sha512").update(signaturePayload).digest("hex");
    const providedBuffer = Buffer.from(notification.signature_key.toLowerCase());
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

    paymentId = notification.order_id;
    reference = notification.transaction_id ?? notification.order_id;

    if (
      notification.transaction_status === "settlement" ||
      (notification.transaction_status === "capture" && notification.fraud_status !== "challenge")
    ) {
      status = "paid";
    } else if (notification.transaction_status === "expire") {
      status = "expired";
    } else if (["cancel", "deny", "failure"].includes(notification.transaction_status)) {
      status = "failed";
    } else {
      status = "pending";
    }
  } else {
    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Webhook payload tidak valid" } },
        400,
      );
    }

    const notification = parsed.data;
    if (!notification.signature || !env.QRIS_WEBHOOK_SECRET) {
      return context.json(
        { success: false, error: { code: "FORBIDDEN", message: "Signature missing" } },
        403,
      );
    }

    const payload = `${notification.payment_id}:${notification.status}:${notification.reference}`;
    const expectedSignature = createHmac("sha256", env.QRIS_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
    const providedBuffer = Buffer.from(notification.signature);
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

    paymentId = notification.payment_id;
    status = notification.status;
    reference = notification.reference;
  }

  const payment = await paymentRepo.findById(paymentId);
  if (!payment) {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Payment tidak ditemukan" } },
      404,
    );
  }

  if (payment.status === "paid") {
    return context.json({ success: true, data: formatPayment(payment) });
  }

  if (payment.expiresAt && payment.expiresAt.getTime() < Date.now()) {
    return context.json(
      { success: false, error: { code: "CONFLICT", message: "QRIS sudah kedaluwarsa. Silakan buat ulang." } },
      409,
    );
  }

  if (status === "paid") {
    const updated = await paymentRepo.markPaid(paymentId, reference);

    const order = await orderRepo.findById(payment.orderId);
    if (order && order.status === "COMPLETED") {
      const nextStatus = transitionOrder(order.status, "PAID");
      await orderRepo.update(order.id, { status: nextStatus });
      await creditWorkerOnPayment(order.id);
      sendOrderNotification(nextStatus as OrderStatus, {
        orderId: order.id,
        orderNumber: order.orderNumber,
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
    sendOrderNotification(nextStatus as OrderStatus, {
      orderId: order.id,
      orderNumber: order.orderNumber,
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
