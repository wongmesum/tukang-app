// Load env vars for tests before any module reads them
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test?schema=public";
process.env.JWT_SECRET = "test-secret-tukangndeso-vitest-only";
process.env.JWT_EXPIRES_IN = "7d";
process.env.JWT_REFRESH_EXPIRES_IN = "30d";
process.env.OTP_EXPIRY_SECONDS = "300";
process.env.OTP_MAX_ATTEMPTS = "5";
