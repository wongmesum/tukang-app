/**
 * Lightweight cPanel build shim.
 *
 * The shared hosting deployment currently uses REPOSITORY_MODE=memory because
 * PostGIS is unavailable. The regular Bun/PostgreSQL build continues to use
 * the real @prisma/client package.
 */
const unavailable = () => {
  throw new Error(
    "Prisma database access is unavailable in the cPanel memory-mode build",
  );
};

const unavailableModel = new Proxy(
  {},
  {
    get: () => unavailable,
  },
);

export class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get: (target, property, receiver) =>
        Reflect.has(target, property)
          ? Reflect.get(target, property, receiver)
          : unavailableModel,
    });
  }

  async $disconnect(): Promise<void> {}

  async $queryRaw(): Promise<never> {
    return unavailable();
  }
}
