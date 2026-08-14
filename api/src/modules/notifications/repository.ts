import { randomUUID } from "node:crypto";
import type { DeviceToken } from "./types";

/**
 * In-memory device token repository (MVP).
 * Production: store in DB table `device_tokens`.
 */
export interface DeviceTokenRepository {
  register(userId: string, token: string, platform: "android" | "ios"): Promise<DeviceToken>;
  unregister(userId: string, token: string): Promise<void>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
}

// --- In-memory implementation ---

const store = new Map<string, DeviceToken[]>();

export const deviceTokenRepo: DeviceTokenRepository = {
  async register(userId, token, platform) {
    const tokens = store.get(userId) ?? [];

    // Avoid duplicates
    const existing = tokens.find((t) => t.token === token);
    if (existing) return existing;

    const record: DeviceToken = {
      id: randomUUID(),
      userId,
      token,
      platform,
      createdAt: new Date(),
    };

    tokens.push(record);
    store.set(userId, tokens);
    return record;
  },

  async unregister(userId, token) {
    const tokens = store.get(userId) ?? [];
    store.set(
      userId,
      tokens.filter((t) => t.token !== token),
    );
  },

  async findByUserId(userId) {
    return store.get(userId) ?? [];
  },
};
