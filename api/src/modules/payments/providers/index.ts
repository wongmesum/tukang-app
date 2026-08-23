import type { PaymentProvider } from "./types";
import { MidtransProvider } from "./midtrans";
import { StubProvider } from "./stub";
import { env } from "../../../config/env";
import { getQrisSettings } from "../../settings/config-store";

export function getPaymentProvider(): PaymentProvider {
  const settings = getQrisSettings();
  if (!settings.enabled) throw new Error("QRIS_DISABLED");

  if (settings.serverKey && settings.clientKey) {
    return new MidtransProvider({
      serverKey: settings.serverKey,
      clientKey: settings.clientKey,
      isProduction: settings.isProduction,
    });
  }

  if (env.NODE_ENV !== "production") {
    return new StubProvider(settings.webhookSecret || "dev-secret");
  }

  throw new Error("QRIS_PROVIDER_NOT_CONFIGURED");
}

export type { PaymentProvider, QrisCreateResult } from "./types";
