import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("services routes", () => {
  it("GET /v1/categories — lists active categories", async () => {
    const res = await app.request("/v1/categories");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(9);
  });

  it("GET /v1/categories/:code/services — lists services for AC", async () => {
    const res = await app.request("/v1/categories/AC/services");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.every((s: { category_code: string }) => s.category_code === "AC")).toBe(true);
  });

  it("GET /v1/categories/:code/services — 404 for unknown category", async () => {
    const res = await app.request("/v1/categories/XX/services");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("GET /v1/services/:id — returns service detail", async () => {
    const res = await app.request("/v1/services/seed-AC-cuci-ac-split");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("Cuci AC Split");
  });

  it("GET /v1/services/:id — 404 for unknown id", async () => {
    const res = await app.request("/v1/services/unknown-id");
    expect(res.status).toBe(404);
  });
});
