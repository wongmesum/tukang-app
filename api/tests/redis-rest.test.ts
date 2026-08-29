import { afterEach, describe, expect, it, vi } from "vitest";
import { RestRedisStore } from "../src/shared/redis";

describe("RestRedisStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends Upstash-compatible commands with bearer authentication", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: "OK" })));
    vi.stubGlobal("fetch", fetchMock);

    const store = new RestRedisStore("https://redis.example.test/", "secret-token");
    await expect(store.set("otp:0812", "payload", "EX", 300)).resolves.toBe("OK");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://redis.example.test",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", "otp:0812", "payload", "EX", 300]),
      }),
    );
  });

  it("surfaces REST command errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "unauthorized" }))),
    );

    const store = new RestRedisStore("https://redis.example.test", "bad-token");
    await expect(store.ping()).rejects.toThrow("Redis REST command failed: unauthorized");
  });
});
