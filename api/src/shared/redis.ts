import { env } from "../config/env";

export interface RedisStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<number>;
  ping(): Promise<string>;
}

type IoredisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<number>;
  ping(): Promise<string>;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
};

/**
 * Lazily loads ioredis for the existing cPanel/Node runtime. Keeping the import
 * behind the adapter prevents Wasmer startup from opening a TCP connection at
 * module-evaluation time.
 */
class IoredisStore implements RedisStore {
  private clientPromise: Promise<IoredisClient> | null = null;

  constructor(private readonly url: string) {}

  private getClient(): Promise<IoredisClient> {
    if (!this.clientPromise) {
      this.clientPromise = import("ioredis").then(({ default: Redis }) => {
        const client = new Redis(this.url, {
          maxRetriesPerRequest: 1,
          retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 500, 3000);
          },
          lazyConnect: true,
          enableOfflineQueue: false,
        }) as unknown as IoredisClient;

        let errorLogged = false;
        client.on("error", (error: unknown) => {
          if (errorLogged) return;
          const message = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.warn(`[Redis] TCP adapter unavailable: ${message}`);
          errorLogged = true;
        });
        client.on("connect", () => {
          errorLogged = false;
          // eslint-disable-next-line no-console
          console.log("[Redis] TCP adapter connected");
        });

        return client;
      });
    }
    return this.clientPromise;
  }

  async get(key: string): Promise<string | null> {
    return (await this.getClient()).get(key);
  }

  async set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<string | null> {
    const client = await this.getClient();
    if (mode && ttlSeconds !== undefined) return client.set(key, value, mode, ttlSeconds);
    return client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return (await this.getClient()).del(key);
  }

  async exists(key: string): Promise<number> {
    return (await this.getClient()).exists(key);
  }

  async ttl(key: string): Promise<number> {
    return (await this.getClient()).ttl(key);
  }

  async incr(key: string): Promise<number> {
    return (await this.getClient()).incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return (await this.getClient()).expire(key, ttlSeconds);
  }

  async ping(): Promise<string> {
    return (await this.getClient()).ping();
  }
}

type RestRedisResponse<T> = {
  result?: T;
  error?: string;
};

/**
 * Redis adapter for stateless/edge deployments. It uses the Upstash-compatible
 * REST command API and only requires the standard fetch implementation.
 */
export class RestRedisStore implements RedisStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command<T>(name: string, ...args: Array<string | number>): Promise<T> {
    const response = await fetch(this.url.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([name, ...args]),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Redis REST request failed (${response.status}): ${details.slice(0, 300)}`);
    }

    const payload = await response.json() as RestRedisResponse<T>;
    if (payload.error) throw new Error(`Redis REST command failed: ${payload.error}`);
    return payload.result as T;
  }

  async get(key: string): Promise<string | null> {
    return this.command<string | null>("GET", key);
  }

  async set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<string | null> {
    if (mode && ttlSeconds !== undefined) {
      return this.command<string | null>("SET", key, value, mode, ttlSeconds);
    }
    return this.command<string | null>("SET", key, value);
  }

  async del(key: string): Promise<number> {
    return this.command<number>("DEL", key);
  }

  async exists(key: string): Promise<number> {
    return this.command<number>("EXISTS", key);
  }

  async ttl(key: string): Promise<number> {
    return this.command<number>("TTL", key);
  }

  async incr(key: string): Promise<number> {
    return this.command<number>("INCR", key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.command<number>("EXPIRE", key, ttlSeconds);
  }

  async ping(): Promise<string> {
    return this.command<string>("PING");
  }
}

function createRedisStore(): RedisStore | null {
  if (env.NODE_ENV === "test" || env.REDIS_DRIVER === "none") return null;

  if (env.REDIS_DRIVER === "rest") {
    if (!env.REDIS_REST_URL || !env.REDIS_REST_TOKEN) return null;
    return new RestRedisStore(env.REDIS_REST_URL, env.REDIS_REST_TOKEN);
  }

  const url = env.REDIS_URL ?? (env.NODE_ENV === "development" ? "redis://localhost:6379" : undefined);
  return url ? new IoredisStore(url) : null;
}

export const redis = createRedisStore();

export async function getRedisHealth(): Promise<"disabled" | "connected" | "unavailable"> {
  if (!redis) return "disabled";
  try {
    await redis.ping();
    return "connected";
  } catch {
    return "unavailable";
  }
}
