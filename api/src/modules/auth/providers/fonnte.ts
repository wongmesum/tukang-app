import type { OtpDeliveryProvider } from "./types";

/**
 * Fonnte WhatsApp API provider for OTP delivery.
 * Docs: https://fonnte.com/api
 * Sends OTP via WhatsApp message to the user's phone number.
 */
export class FonnteProvider implements OtpDeliveryProvider {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async send(phone: string, code: string): Promise<boolean> {
    // Fonnte expects phone without leading 0, with 62 prefix
    const formattedPhone = this.formatPhone(phone);
    const message = `*TukangNDeso* - Kode OTP Anda: *${code}*\n\nJangan bagikan kode ini ke siapapun.\nKode berlaku 5 menit.`;

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": this.apiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message,
          countryCode: "62",
        }),
      });

      const data = await response.json() as { status?: boolean; reason?: string };

      if (!data.status) {
        // eslint-disable-next-line no-console
        console.error(`[Fonnte] Failed to send OTP to ${phone}: ${data.reason ?? "unknown"}`);
        return false;
      }

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[Fonnte] Error sending OTP:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  private formatPhone(phone: string): string {
    // Convert 08xxx → 628xxx
    if (phone.startsWith("0")) {
      return "62" + phone.slice(1);
    }
    if (phone.startsWith("+62")) {
      return phone.slice(1);
    }
    if (phone.startsWith("62")) {
      return phone;
    }
    return "62" + phone;
  }
}
