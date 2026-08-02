import { describe, expect, it, vi } from "vitest";
import { InMemoryOtpStore } from "../src/modules/auth/otp-store";
import type { StoredOtpRecord } from "../src/modules/auth/otp";

describe("OtpStore", () => {
  it("cleans up expired records lazily on get", async () => {
    vi.useFakeTimers();
    const store = new InMemoryOtpStore();
    const phone = "081234567890";

    const record: StoredOtpRecord = {
      phone,
      code: "123456",
      expiresAt: new Date(Date.now() + 1000), // expires in 1s
      attempts: 0,
    };

    await store.set(phone, record);
    expect(await store.get(phone)).toEqual(record);

    // Fast-forward past expiry AND past cleanup interval (60s)
    vi.advanceTimersByTime(65_000);

    // Should return null and clean up
    expect(await store.get(phone)).toBeNull();

    vi.useRealTimers();
  });
});
