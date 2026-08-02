import { describe, expect, it } from "vitest";
import {
  OtpExpiredError,
  OtpInvalidError,
  OtpMaxAttemptsError,
  generateOtpCode,
  validateOtpRecord,
  type StoredOtpRecord,
} from "../src/modules/auth/otp";

describe("otp", () => {
  it("generates 6 digit numeric otp", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("accepts valid otp", () => {
    const record: StoredOtpRecord = {
      phone: "081234567890",
      code: "123456",
      expiresAt: new Date("2026-08-01T10:05:00+07:00"),
      attempts: 0,
    };

    const result = validateOtpRecord({
      record,
      submittedCode: "123456",
      now: new Date("2026-08-01T10:00:00+07:00"),
      maxAttempts: 5,
    });

    expect(result.isValid).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it("rejects invalid otp", () => {
    const record: StoredOtpRecord = {
      phone: "081234567890",
      code: "123456",
      expiresAt: new Date("2026-08-01T10:05:00+07:00"),
      attempts: 0,
    };

    expect(() =>
      validateOtpRecord({
        record,
        submittedCode: "000000",
        now: new Date("2026-08-01T10:00:00+07:00"),
        maxAttempts: 5,
      }),
    ).toThrow(OtpInvalidError);
  });

  it("rejects expired otp", () => {
    const record: StoredOtpRecord = {
      phone: "081234567890",
      code: "123456",
      expiresAt: new Date("2026-08-01T10:05:00+07:00"),
      attempts: 0,
    };

    expect(() =>
      validateOtpRecord({
        record,
        submittedCode: "123456",
        now: new Date("2026-08-01T10:06:00+07:00"),
        maxAttempts: 5,
      }),
    ).toThrow(OtpExpiredError);
  });

  it("rejects otp after max attempts", () => {
    const record: StoredOtpRecord = {
      phone: "081234567890",
      code: "123456",
      expiresAt: new Date("2026-08-01T10:05:00+07:00"),
      attempts: 5,
    };

    expect(() =>
      validateOtpRecord({
        record,
        submittedCode: "123456",
        now: new Date("2026-08-01T10:00:00+07:00"),
        maxAttempts: 5,
      }),
    ).toThrow(OtpMaxAttemptsError);
  });
});
