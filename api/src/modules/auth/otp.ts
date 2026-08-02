export interface StoredOtpRecord {
  phone: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

export interface ValidateOtpInput {
  record: StoredOtpRecord;
  submittedCode: string;
  now: Date;
  maxAttempts: number;
}

export interface ValidateOtpResult {
  isValid: boolean;
  attempts: number;
}

export class OtpInvalidError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OtpInvalidError";
  }
}

export class OtpExpiredError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OtpExpiredError";
  }
}

export class OtpMaxAttemptsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OtpMaxAttemptsError";
  }
}

export function generateOtpCode(): string {
  const value = Math.floor(Math.random() * 1000000);
  return String(value).padStart(6, "0");
}

export function validateOtpRecord(input: ValidateOtpInput): ValidateOtpResult {
  const { record, submittedCode, now, maxAttempts } = input;

  if (record.attempts >= maxAttempts) {
    throw new OtpMaxAttemptsError("Percobaan OTP melebihi batas maksimum");
  }

  const nextAttempts = record.attempts + 1;

  if (now.getTime() > record.expiresAt.getTime()) {
    throw new OtpExpiredError("Kode OTP sudah kadaluarsa");
  }

  if (record.code !== submittedCode) {
    throw new OtpInvalidError("Kode OTP salah");
  }

  return {
    isValid: true,
    attempts: nextAttempts,
  };
}
