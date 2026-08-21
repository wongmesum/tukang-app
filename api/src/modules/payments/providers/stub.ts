import { createHmac } from "crypto";
import type { PaymentProvider, QrisCreateResult } from "./types";

/**
 * Stub provider for development without real payment gateway.
 * Generates fake QR strings and always verifies signatures.
 */
export class StubProvider implements PaymentProvider {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  async createQris(params: {
    paymentId: string;
    amount: number;
    orderId: string;
    description: string;
    expiryMinutes: number;
  }): Promise<QrisCreateResult> {
    // Generate a fake QRIS string
    const qrString = `000201010211${params.paymentId.slice(0, 12)}520400005303360${params.amount}6304ABCD`;
    const qrImageUrl = `https://cdn.tukangndeso.id/qr/${params.paymentId}.png`;

    return {
      qrString,
      qrImageUrl,
      externalId: `STUB-${params.paymentId.slice(0, 8)}`,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expected = createHmac("sha256", this.webhookSecret).update(payload).digest("hex");
    return expected === signature;
  }
}
