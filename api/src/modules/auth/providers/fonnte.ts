import type { OtpDeliveryProvider } from "./types";

export class FonnteProvider implements OtpDeliveryProvider {
  constructor(
    private readonly apiToken: string,
    private readonly messageTemplate: string,
    private readonly expirySeconds: number,
  ) {}

  async send(phone: string, code: string): Promise<boolean> {
    const formattedPhone = this.formatPhone(phone);
    const message = this.messageTemplate
      .replaceAll("{{code}}", code)
      .replaceAll("{{expiry_minutes}}", String(Math.ceil(this.expirySeconds / 60)));

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: this.apiToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: formattedPhone, message, countryCode: "62" }),
      });
      const data = await response.json() as { status?: boolean; reason?: string };
      if (!response.ok || !data.status) {
        console.error(`[Fonnte] Failed to send OTP: ${data.reason ?? response.status}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Fonnte] Error sending OTP:", error instanceof Error ? error.message : error);
      return false;
    }
  }

  private formatPhone(phone: string): string {
    if (phone.startsWith("0")) return `62${phone.slice(1)}`;
    if (phone.startsWith("+62")) return phone.slice(1);
    if (phone.startsWith("62")) return phone;
    return `62${phone}`;
  }
}
