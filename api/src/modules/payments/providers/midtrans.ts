import { createHmac } from "crypto";
import type { PaymentProvider, QrisCreateResult } from "./types";

const SANDBOX_URL = "https://api.sandbox.midtrans.com";
const PRODUCTION_URL = "https://api.midtrans.com";

interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
}

function getBaseUrl(isProduction: boolean): string {
  return isProduction ? PRODUCTION_URL : SANDBOX_URL;
}

function encodeAuth(serverKey: string): string {
  return Buffer.from(`${serverKey}:`).toString("base64");
}

/**
 * Midtrans QRIS payment provider.
 * Uses Midtrans Core API to create dynamic QRIS.
 * Docs: https://docs.midtrans.com/reference/qris
 */
export class MidtransProvider implements PaymentProvider {
  private config: MidtransConfig;

  constructor(config: MidtransConfig) {
    this.config = config;
  }

  async createQris(params: {
    paymentId: string;
    amount: number;
    orderId: string;
    description: string;
    expiryMinutes: number;
  }): Promise<QrisCreateResult> {
    const baseUrl = getBaseUrl(this.config.isProduction);
    const authHeader = encodeAuth(this.config.serverKey);

    const body = {
      payment_type: "qris",
      transaction_details: {
        order_id: params.paymentId,
        gross_amount: params.amount,
      },
      qris: {
        acquirer: "gopay", // Midtrans QRIS via GoPay acquirer
      },
      custom_expiry: {
        expiry_duration: params.expiryMinutes,
        unit: "minute",
      },
      item_details: [{
        id: params.orderId,
        price: params.amount,
        quantity: 1,
        name: params.description.slice(0, 50),
      }],
    };

    const response = await fetch(`${baseUrl}/v2/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as {
      status_code?: string;
      actions?: Array<{ name: string; url: string }>;
      transaction_id?: string;
      status_message?: string;
    };

    if (data.status_code !== "201" && data.status_code !== "200") {
      throw new Error(`Midtrans error: ${data.status_message ?? "Unknown error"}`);
    }

    // Extract QR string and image from actions
    const qrAction = data.actions?.find((a) => a.name === "generate-qr-code");
    const qrImageUrl = qrAction?.url ?? "";
    const qrString = data.transaction_id ?? params.paymentId;

    return {
      qrString,
      qrImageUrl,
      externalId: data.transaction_id ?? "",
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Midtrans signature: SHA512(order_id + status_code + gross_amount + server_key)
    const expectedSignature = createHmac("sha512", this.config.serverKey)
      .update(payload)
      .digest("hex");
    return expectedSignature === signature;
  }
}
