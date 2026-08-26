# Wasmer Edge migration plan

This document tracks a safe migration of the TukangNDeso API away from cPanel without cutting production over prematurely.

## Current API runtime

The current API is not a drop-in Wasmer Edge workload. It currently depends on:

- Bun (`Bun.serve`) for the primary HTTP/WebSocket server.
- Prisma with its native query engine.
- Redis through `ioredis` for OTP, token revocation and rate limiting.
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
5. Replace or isolate the long-running order-expiry process so it does not depend on an always-running application instance.
6. Build a Wasmer-compatible stateless HTTP entrypoint.
7. Deploy it to a temporary `*.wasmer.app` URL.

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

### Bun server

`api/src/server.ts` directly uses `Bun.serve` and Bun WebSocket APIs. A Wasmer-specific HTTP entrypoint must avoid assuming the Bun process model.

### Prisma

Prisma normally relies on native runtime components. Confirm a Wasmer/WASIX-compatible database client strategy before enabling production database access. Do not assume the existing Prisma engine binary can run unchanged.

### Redis

Keep Redis external. Do not run Redis inside an application instance.

### Background jobs

`startOrderExpiryJob()` assumes a long-lived process. Move expiry processing to a scheduled/queue-driven job or make the operation request-driven/idempotent before relying on autoscaled ephemeral instances.

### Uploads

Do not rely on the local `uploads/` directory in production. Use the existing S3-compatible configuration (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`) and `CDN_BASE_URL`.

### WebSockets

Treat WebSocket support separately from basic HTTP migration. The existing REST realtime fallback can remain the initial compatibility path while the Wasmer runtime path is validated.

## Secrets to configure in Wasmer

Do not commit production values. Configure these in the Wasmer app secrets/dashboard when the staging app exists:

- `DATABASE_URL`
- `REDIS_URL`
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
