import type { PaymentProvider } from "./types";
import { MidtransProvider } from "./midtrans";
import { StubProvider } from "./stub";

/**
 * Factory to get the active payment provider based on environment.
 * In production with Midtrans keys configured → use Midtrans.
 * Otherwise → use Stub (fake QR for development).
 */
export function getPaymentProvider(): PaymentProvider {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (serverKey && clientKey) {
    return new MidtransProvider({
      serverKey,
      clientKey,
      isProduction,
    });
  }

  // Fallback to stub
  const webhookSecret = process.env.QRIS_WEBHOOK_SECRET ?? "dev-secret";
  return new StubProvider(webhookSecret);
}

export type { PaymentProvider, QrisCreateResult } from "./types";
