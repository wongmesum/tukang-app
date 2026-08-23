import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { generateTokenPair } from "../src/modules/auth/jwt";
import {
  updateGoogleAuthSettings,
  updateOtpSettings,
  updateQrisSettings,
} from "../src/modules/settings/config-store";
import { userRepo } from "../src/modules/users/repository";

async function adminAuth(): Promise<string> {
  const user = await userRepo.create({
    phone: `08${Date.now().toString().slice(-10)}`,
    name: "Settings Admin",
    role: "admin",
  });
  return `Bearer ${generateTokenPair({ userId: user.id, role: user.role }).token}`;
}

afterEach(() => {
  updateOtpSettings({ enabled: true, provider: "console", expirySeconds: 300, maxAttempts: 5 });
  updateQrisSettings({ enabled: true, expiryMinutes: 15 });
  updateGoogleAuthSettings({ enabled: false, webClientId: "", androidClientId: "", iosClientId: "" });
});

describe("dynamic integration settings", () => {
  it("exposes only public feature flags to clients", async () => {
    updateGoogleAuthSettings({ enabled: true, webClientId: "web.apps.googleusercontent.com" });
    updateOtpSettings({ enabled: false, apiToken: "private-token" });
    const response = await app.request("/v1/config/public");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.features.google_auth_enabled).toBe(true);
    expect(json.data.features.otp_enabled).toBe(false);
    expect(JSON.stringify(json)).not.toContain("private-token");
  });

  it("lets admins update OTP and Google flags immediately", async () => {
    const auth = await adminAuth();
    const otp = await app.request("/v1/admin/settings/otp", {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false, expiry_seconds: 180, max_attempts: 3 }),
    });
    expect(otp.status).toBe(200);

    const google = await app.request("/v1/admin/settings/google-auth", {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true, web_client_id: "web.apps.googleusercontent.com" }),
    });
    expect(google.status).toBe(200);

    const publicConfig = await (await app.request("/v1/config/public")).json();
    expect(publicConfig.data.features.otp_enabled).toBe(false);
    expect(publicConfig.data.features.google_auth_enabled).toBe(true);
  });

  it("rejects Google login while the feature is disabled", async () => {
    updateGoogleAuthSettings({ enabled: false });
    const response = await app.request("/v1/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: "not-a-real-google-id-token-value" }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("GOOGLE_AUTH_DISABLED");
  });
});
