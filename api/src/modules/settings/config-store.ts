import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { dirname, resolve } from "path";

export interface RedisSettings {
  url: string;
  enabled: boolean;
}

export interface QrisSettings {
  enabled: boolean;
  provider: "midtrans";
  isProduction: boolean;
  serverKey: string;
  clientKey: string;
  webhookSecret: string;
  merchantId: string;
  expiryMinutes: number;
}

export interface OtpSettings {
  enabled: boolean;
  provider: "fonnte" | "console";
  apiToken: string;
  expirySeconds: number;
  maxAttempts: number;
  messageTemplate: string;
}

export interface GoogleAuthSettings {
  enabled: boolean;
  webClientId: string;
  androidClientId: string;
  iosClientId: string;
}

export interface AppSettings {
  redis: RedisSettings;
  qris: QrisSettings;
  otp: OtpSettings;
  googleAuth: GoogleAuthSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    enabled: process.env.REDIS_ENABLED === "true" || Boolean(process.env.REDIS_URL),
  },
  qris: {
    enabled:
      process.env.QRIS_ENABLED === "true" || process.env.NODE_ENV !== "production",
    provider: "midtrans",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
    webhookSecret: process.env.QRIS_WEBHOOK_SECRET ?? "",
    merchantId: process.env.QRIS_MERCHANT_ID ?? "",
    expiryMinutes: Number(process.env.QRIS_EXPIRY_MINUTES ?? "15"),
  },
  otp: {
    enabled: process.env.OTP_ENABLED !== "false",
    provider:
      process.env.OTP_PROVIDER === "console" ||
      (!process.env.FONNTE_API_TOKEN && process.env.NODE_ENV !== "production")
        ? "console"
        : "fonnte",
    apiToken: process.env.FONNTE_API_TOKEN ?? "",
    expirySeconds: Number(process.env.OTP_EXPIRY_SECONDS ?? "300"),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? "5"),
    messageTemplate:
      process.env.OTP_MESSAGE_TEMPLATE ??
      "*TukangNDeso* - Kode OTP Anda: *{{code}}*\n\nJangan bagikan kode ini kepada siapa pun.",
  },
  googleAuth: {
    enabled: process.env.GOOGLE_AUTH_ENABLED === "true",
    webClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? "",
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID ?? "",
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? "",
  },
};

type StoredEnvelope = {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

const settingsPath = resolve(
  process.env.SETTINGS_FILE_PATH ?? "data/runtime-settings.enc.json",
);

function encryptionKey(): Buffer {
  const source = process.env.SETTINGS_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? "development-only";
  return createHash("sha256").update(source).digest();
}

function encrypt(settings: AppSettings): StoredEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(settings), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decrypt(envelope: StoredEnvelope): Partial<AppSettings> {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as Partial<AppSettings>;
}

function mergeSettings(saved?: Partial<AppSettings>): AppSettings {
  return {
    redis: { ...DEFAULT_SETTINGS.redis, ...saved?.redis },
    qris: { ...DEFAULT_SETTINGS.qris, ...saved?.qris, provider: "midtrans" },
    otp: { ...DEFAULT_SETTINGS.otp, ...saved?.otp },
    googleAuth: { ...DEFAULT_SETTINGS.googleAuth, ...saved?.googleAuth },
  };
}

function loadSettings(): AppSettings {
  if (process.env.NODE_ENV === "test" || !existsSync(settingsPath)) {
    return structuredClone(DEFAULT_SETTINGS);
  }
  try {
    const envelope = JSON.parse(readFileSync(settingsPath, "utf8")) as StoredEnvelope;
    return mergeSettings(decrypt(envelope));
  } catch (error) {
    console.error("[Settings] Failed to load encrypted settings:", error);
    return structuredClone(DEFAULT_SETTINGS);
  }
}

let currentSettings = loadSettings();

function persist(): void {
  if (process.env.NODE_ENV === "test") return;
  mkdirSync(dirname(settingsPath), { recursive: true });
  const temporaryPath = `${settingsPath}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(encrypt(currentSettings)), { mode: 0o600 });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, settingsPath);
}

export function getSettings(): AppSettings {
  return structuredClone(currentSettings);
}

function updateSection<K extends keyof AppSettings>(
  section: K,
  patch: Partial<AppSettings[K]>,
): AppSettings[K] {
  currentSettings[section] = {
    ...currentSettings[section],
    ...patch,
  } as AppSettings[K];
  persist();
  return structuredClone(currentSettings[section]);
}

export const getRedisSettings = (): RedisSettings => structuredClone(currentSettings.redis);
export const getQrisSettings = (): QrisSettings => structuredClone(currentSettings.qris);
export const getOtpSettings = (): OtpSettings => structuredClone(currentSettings.otp);
export const getGoogleAuthSettings = (): GoogleAuthSettings =>
  structuredClone(currentSettings.googleAuth);

export const updateRedisSettings = (patch: Partial<RedisSettings>): RedisSettings =>
  updateSection("redis", patch);
export const updateQrisSettings = (patch: Partial<QrisSettings>): QrisSettings =>
  updateSection("qris", patch);
export const updateOtpSettings = (patch: Partial<OtpSettings>): OtpSettings =>
  updateSection("otp", patch);
export const updateGoogleAuthSettings = (
  patch: Partial<GoogleAuthSettings>,
): GoogleAuthSettings => updateSection("googleAuth", patch);

export function maskSecret(value: string): string {
  if (!value) return "";
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

export function maskRedisUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.password) parsed.password = "********";
    return parsed.toString();
  } catch {
    return value ? "configured" : "";
  }
}
