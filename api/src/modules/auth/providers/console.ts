import type { OtpDeliveryProvider } from "./types";

/**
 * Console provider for development — just logs the OTP code.
 */
export class ConsoleOtpProvider implements OtpDeliveryProvider {
  async send(phone: string, code: string): Promise<boolean> {
    // eslint-disable-next-line no-console
    console.log(`[DEV] OTP for ${phone}: ${code}`);
    return true;
  }
}
