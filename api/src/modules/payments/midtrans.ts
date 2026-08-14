import { createHmac } from "node:crypto";
import { env } from "../../config/env";

/**
 * Midtrans QRIS Integration
 *
 * Uses Midtrans Core API to generate dynamic QRIS for each payment.
 * Reference: https://docs.midtrans.com/reference/qris
 *
 * Flow:
 * 1. Customer confirms order → backend calls createQrisCharge()
 * 2. Midtrans returns QR string + image URL
 * 3. Customer scans QR with any payment app (GoPay, OVO, DANA, etc.)
 * 4. Midtrans sends webhook to /payments/webhook/qris
 * 5. Backend verifies signature, marks payment as paid
 */

interface MidtransChargeRequest {
  payment_type: "qris";
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  qris?: {
    acquirer?: string; // "gopay" | "airpay shopee" — leave empty for dynamic
  };
  custom_expiry?: {
    expiry_duration: number;
    unit: "minute" | "hour" | "day";
  };
}

interface MidtransChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  actions?: Array<{
    name: string;
    method: string;
    url: string;
  }>;
  qr_string?: string;
  acquirer?: string;
  expiry_time?: string;
}

interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  settlement_time?: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
}

// --- Configuration ---

function getBaseUrl(): string {
  return env.MIDTRANS_IS_PRODUCTION
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function getAuthHeader(): string {
  const serverKey = env.MIDTRANS_SERVER_KEY ?? "";
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

// --- Public API ---

export interface QrisChargeResult {
  success: boolean;
  transactionId?: string;
  qrString?: string;
  qrImageUrl?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Create a QRIS charge via Midtrans Core API.
 */
export async function createQrisCharge(params: {
  orderId: string;
  amount: number;
  expiryMinutes?: number;
}): Promise<QrisChargeResult> {
  const { orderId, amount, expiryMinutes = 15 } = params;

  if (!env.MIDTRANS_SERVER_KEY) {
    // Midtrans not configured — return stub for development
    return createStubQris(orderId, amount, expiryMinutes);
  }

  const payload: MidtransChargeRequest = {
    payment_type: "qris",
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    custom_expiry: {
      expiry_duration: expiryMinutes,
      unit: "minute",
    },
  };

  try {
    const response = await fetch(`${getBaseUrl()}/charge`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as MidtransChargeResponse;

    if (data.status_code === "201" || data.status_code === "200") {
      // Extract QR image URL from actions
      const qrAction = data.actions?.find(
        (a) => a.name === "generate-qr-code" || a.name === "qr-code",
      );

      return {
        success: true,
        transactionId: data.transaction_id,
        qrString: data.qr_string ?? undefined,
        qrImageUrl: qrAction?.url ?? undefined,
        expiresAt: data.expiry_time ? new Date(data.expiry_time) : undefined,
      };
    }

    return {
      success: false,
      error: data.status_message ?? `Midtrans error: ${data.status_code}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Midtrans connection failed",
    };
  }
}

/**
 * Verify Midtrans webhook notification signature.
 *
 * Signature formula: SHA512(order_id + status_code + gross_amount + server_key)
 */
export function verifyMidtransSignature(notification: MidtransNotification): boolean {
  const serverKey = env.MIDTRANS_SERVER_KEY ?? env.QRIS_WEBHOOK_SECRET ?? "";

  const payload = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const expectedSignature = createHmac("sha512", "")
    .update(payload)
    .digest("hex");

  // Midtrans uses plain SHA512 (not HMAC), so we use crypto.createHash instead
  const { createHash } = require("node:crypto");
  const computedSignature = createHash("sha512").update(payload).digest("hex");

  return computedSignature === notification.signature_key;
}

/**
 * Parse Midtrans notification into our payment status.
 */
export function parseMidtransStatus(notification: MidtransNotification): {
  isPaid: boolean;
  isExpired: boolean;
  reference: string;
} {
  const { transaction_status, fraud_status, transaction_id } = notification;

  const isPaid =
    (transaction_status === "capture" && fraud_status === "accept") ||
    transaction_status === "settlement";

  const isExpired =
    transaction_status === "expire" || transaction_status === "cancel";

  return { isPaid, isExpired, reference: transaction_id };
}

/**
 * Check transaction status via Midtrans API (polling fallback).
 */
export async function checkTransactionStatus(orderId: string): Promise<MidtransNotification | null> {
  if (!env.MIDTRANS_SERVER_KEY) return null;

  try {
    const response = await fetch(`${getBaseUrl()}/${orderId}/status`, {
      headers: {
        Authorization: getAuthHeader(),
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return (await response.json()) as MidtransNotification;
    }
    return null;
  } catch {
    return null;
  }
}

// --- Development stub ---

function createStubQris(orderId: string, amount: number, expiryMinutes: number): QrisChargeResult {
  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[MIDTRANS-STUB] QRIS charge: orderId=${orderId} amount=${amount}`);
  }

  const fakeId = `STUB-${Date.now()}-${orderId.slice(0, 8)}`;
  return {
    success: true,
    transactionId: fakeId,
    qrString: `00020101021226${orderId.slice(0, 12)}520400005303360${amount}6304ABCD`,
    qrImageUrl: `https://cdn.tukangndeso.id/qr/${fakeId}.png`,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
  };
}
