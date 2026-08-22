import type { OtpDeliveryProvider } from "./types";
import { FonnteProvider } from "./fonnte";
import { ConsoleOtpProvider } from "./console";
import { env } from "../../../config/env";
import { getOtpSettings } from "../../settings/config-store";

export function getOtpProvider(): OtpDeliveryProvider {
  const settings = getOtpSettings();
  if (!settings.enabled) throw new Error("OTP_DISABLED");

  if (settings.provider === "fonnte" && settings.apiToken) {
    return new FonnteProvider(
      settings.apiToken,
      settings.messageTemplate,
      settings.expirySeconds,
    );
  }

  if (settings.provider === "console" && env.NODE_ENV !== "production") {
    return new ConsoleOtpProvider();
  }

  throw new Error("OTP_PROVIDER_NOT_CONFIGURED");
}

export type { OtpDeliveryProvider } from "./types";
