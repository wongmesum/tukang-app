# Wasmer Edge migration plan

This document tracks a safe migration of the TukangNDeso API away from cPanel without cutting production over prematurely.

## Current API runtime

The migration branch now has a dedicated Wasmer/Anybuild Node entrypoint. The
remaining production validation work depends on external staging credentials.
The cPanel runtime remains separate and unchanged by default.

The API still contains runtime-specific paths that are intentionally isolated:

- Bun (`Bun.serve`) for the primary HTTP/WebSocket server.
- Prisma using the pure-JavaScript `pg` driver adapter (`engineType = "client"`).
- Redis TCP through `ioredis` for cPanel and Redis REST for Wasmer.
- A long-running order-expiry background job.
- Local `uploads/` filesystem serving.
- WebSocket upgrades at `/v1/realtime`.

Wasmer Edge applications are HTTP workloads backed by Wasmer packages/WASIX and application instances are ephemeral. Therefore the migration must separate stateless request handling from stateful services before production cutover.

## Target architecture

```text
geje.tech / customer web / Android app
                 |
                 v
        https://api.geje.tech
                 |
                 v
            Wasmer Edge API
        /          |          \
 PostgreSQL      Redis      Object storage
                 |               |
          OTP / rate limit    uploads/CDN
```

External integrations remain configured using secrets/environment variables:

- JWT
- OTP provider/config
- Midtrans/QRIS
- Google OAuth
- Google Maps
- FCM

## Migration phases

### Phase 1 - Compatibility and staging

1. Keep cPanel production API online.
2. Keep the current database unchanged.
3. Move all persistent uploads to S3-compatible object storage/CDN.
4. Keep Redis as an external managed service.
5. Use the protected, idempotent `POST /internal/jobs/expire-orders` endpoint from an external scheduler. **Implemented.**
6. Build a Wasmer-compatible stateless HTTP entrypoint with the official Anybuild Node/Hono provider. **Implemented.**
7. Validate build, tests and a local health smoke test in GitHub Actions. **Implemented.**
8. Deploy it to a temporary `*.wasmer.app` URL. **Pending Wasmer authentication and staging secrets.**

### Phase 2 - API validation

Before changing DNS, validate at least:

- `GET /health`
- public configuration endpoint
- customer OTP request/verification
- admin login
- Google sign-in callback
- order create/read/update flow
- QRIS payment creation and webhook verification
- Redis-backed rate limiting/token revocation
- uploads through object storage
- frontend and Android API base URL
- CORS from production web origin

### Phase 3 - Domain cutover

Only after staging passes:

1. Point `api.geje.tech` to the Wasmer deployment.
2. Update customer web, admin web and Android production configuration to use `https://api.geje.tech`.
3. Keep the old cPanel API available as rollback during the observation window.
4. Remove the cPanel API only after production traffic is stable.

## Runtime blockers to resolve

### Runtime entrypoint

`api/src/server.ts` remains the Bun/WebSocket entrypoint. Wasmer uses
`api/src/server-wasmer.ts`, a stateless Node/Hono entrypoint bound to
`0.0.0.0`. `api/Anybuild` follows Wasmer's official Node + Hono provider.

### Prisma

Prisma is generated with `engineType = "client"` and uses
`@prisma/adapter-pg`, avoiding the Rust query engine. Staging must still prove
that the external PostgreSQL endpoint is reachable and correctly secured.

### Redis

Keep Redis external. cPanel uses the lazily loaded `ioredis` TCP adapter.
Wasmer requires `REDIS_DRIVER=rest`, `REDIS_REQUIRED=true`, and an
Upstash-compatible REST URL/token. OTP state, token revocation, and rate limits
then share Redis across instances. If Redis is unavailable, readiness fails
instead of silently accepting a per-instance memory fallback.

### Background jobs

Wasmer refuses to start when `BACKGROUND_JOBS_ENABLED=true`. Run order expiry
externally through the protected `POST /internal/jobs/expire-orders` endpoint.

### Uploads

Do not rely on the local `uploads/` directory in production. Use the existing S3-compatible configuration (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`) and `CDN_BASE_URL`.

### WebSockets

Treat WebSocket support separately from basic HTTP migration. The existing REST realtime fallback can remain the initial compatibility path while the Wasmer runtime path is validated.

## Secrets to configure in Wasmer

Do not commit production values. Configure these in the Wasmer app secrets/dashboard when the staging app exists:

- `DATABASE_URL`
- `REDIS_REST_URL`
- `REDIS_REST_TOKEN`
- `JWT_SECRET`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `QRIS_WEBHOOK_SECRET`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `GOOGLE_MAPS_API_KEY`
- Google OAuth secrets used by the auth implementation
- FCM credentials/configuration

## Rollback rule

The DNS/API-base-url cutover is the last step, not the first. If any staging validation fails, production continues to use the existing cPanel API.

## Build and staging commands

From `api/`:

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run build:wasmer
```

The `Anybuild` file is the deployment definition. Deploy only to a temporary
Wasmer application first, with values from `.env.wasmer.example` stored as
platform secrets. Do not attach `api.geje.tech` until every Phase 2 check passes.
