import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { env } from "../src/config/env";

describe("dev routes", () => {
  const originalEnv = env.NODE_ENV;

  afterEach(() => {
    // Reset for other tests
    (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
  });

  it("GET /dev — renders HTML in non-production environments", async () => {
    (env as { NODE_ENV: string }).NODE_ENV = "development";
    const res = await app.request("/dev");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("TukangNDeso Dev Console");
    expect(html).toContain("Mojokerto");
  });

  it("GET /dev — returns 404 in production", async () => {
    (env as { NODE_ENV: string }).NODE_ENV = "production";
    const res = await app.request("/dev");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
