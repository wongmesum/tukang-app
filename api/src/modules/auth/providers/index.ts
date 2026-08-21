import type { OtpDeliveryProvider } from "./types";
import { FonnteProvider } from "./fonnte";
import { ConsoleOtpProvider } from "./console";
import { env } from "../../../config/env";

/**
 * Get the active OTP delivery provider.
 * Production with FONNTE_API_TOKEN → use Fonnte (WhatsApp).
 * Otherwise → console log.
 */
export function getOtpProvider(): OtpDeliveryProvider {
  const fonnteToken = process.env.FONNTE_API_TOKEN;

  if (fonnteToken && env.NODE_ENV !== "test") {
    return new FonnteProvider(fonnteToken);
  }

  return new ConsoleOtpProvider();
}

export type { OtpDeliveryProvider } from "./types";
