# TukangNDeso

Marketplace jasa tukang untuk wilayah Mojokerto Kabupaten.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![Bun](https://img.shields.io/badge/Runtime-Bun-000)]()
[![Flutter](https://img.shields.io/badge/Mobile-Flutter-02569B)]()
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20PostGIS-336791)]()

## Arsitektur

```
tukang-app/
├── api/       — Backend (TypeScript + Hono + Bun + Prisma)
├── app/       — Mobile (Flutter + Riverpod + go_router)
├── admin/     — Admin Panel (React + Vite)
└── docs/      — Spesifikasi produk
```

## Quick Start (Docker — Rekomendasi)

```bash
# 1. Clone
git clone https://github.com/wongmesum/tukang-app.git
cd tukang-app

# 2. Start semua service
docker compose up -d

# 3. Tunggu healthy (± 30 detik)
docker compose ps   # pastikan semua "healthy"

# 4. Seed data demo
curl -X POST http://localhost:3000/dev/seed/full | jq .

# 5. Buka admin panel
open http://localhost:5173
# Login pakai admin token dari response seed

# 6. Test API
curl http://localhost:3000/health | jq .
```

## Quick Start (Manual)

### Backend

```bash
cd api
bun install
cp .env.example .env
# Edit .env: set DATABASE_URL ke PostgreSQL lokal

# Jalankan migrasi (jika pakai Prisma)
bunx prisma db push

# Seed data
bun dev &
curl -X POST http://localhost:3000/dev/seed/full | jq .

# Run tests
bun test
```

### Admin Panel

```bash
cd admin
npm install
npm run dev
# → http://localhost:5173
```

### Mobile (Flutter)

```bash
cd app
flutter pub get

# Tempatkan config Firebase:
# - android/app/google-services.json
# - ios/Runner/GoogleService-Info.plist

flutter run --flavor development
```

## API Endpoints

| Modul | Endpoint | Deskripsi |
|-------|----------|-----------|
| Health | `GET /health` | Status API + database |
| Auth | `POST /v1/auth/otp/request` | Kirim OTP |
| Auth | `POST /v1/auth/otp/verify` | Verifikasi → JWT |
| Auth | `POST /v1/auth/refresh` | Refresh token |
| Pricing | `POST /v1/pricing/estimate` | Hitung estimasi harga |
| Orders | `POST /v1/orders` | Buat order baru |
| Orders | `GET /v1/orders` | Riwayat order |
| Worker | `POST /v1/worker/orders/:id/accept` | Terima order |
| Worker | `POST /v1/worker/orders/:id/start` | Mulai kerja |
| Worker | `POST /v1/worker/orders/:id/complete` | Selesai |
| Payment | `POST /v1/payments/qris/create` | Generate QRIS |
| Upload | `POST /v1/upload/image` | Upload foto |
| Chat | `POST /v1/orders/:id/messages` | Kirim pesan ke pihak lain |
| Chat | `GET /v1/orders/:id/messages` | Riwayat chat + jumlah belum dibaca |
| Chat | `POST /v1/orders/:id/messages/read` | Tandai sudah dibaca |
| Dispute | `POST /v1/orders/:id/dispute` | Lapor sengketa (pelanggan/tukang) |
| Dispute | `GET /v1/admin/disputes?status=open` | Daftar sengketa + alasan |
| Dispute | `POST /v1/admin/disputes/:id/resolve` | Selesaikan sengketa |
| WebSocket | `ws://host/v1/realtime?token=jwt` | Real-time tracking |
| Admin | `GET /v1/admin/reports/summary` | Dashboard stats |

Lihat dokumentasi lengkap: [`TUKANGNDESO-MASTER-BUILD.txt`](TUKANGNDESO-MASTER-BUILD.txt)

## WebSocket Protocol

```
Connect: ws://localhost:3000/v1/realtime?token=<jwt>

Client → Server:
  {"type":"subscribe.order","payload":{"order_id":"..."}}
  {"type":"worker.location","payload":{"order_id":"...","lat":-7.47,"lng":112.43}}
  {"type":"ping","payload":{}}

Server → Client:
  {"type":"order.status_changed","payload":{"order_id":"...","status":"ACCEPTED"}}
  {"type":"order.new_match","payload":{"order_id":"...","distance_km":2.4,...}}
  {"type":"worker.location_update","payload":{"worker_id":"...","lat":-7.47,"lng":112.43}}
  {"type":"chat.message","payload":{"order_id":"...","sender_id":"...","content":"..."}}
  {"type":"pong","payload":{}}
```

## Idempotency

`POST /v1/orders` menerima header `Idempotency-Key`. Permintaan ulang dengan key
yang sama mengembalikan order yang sama alih-alih membuat duplikat — melindungi
dari double-tap dan retry jaringan.

```bash
curl -X POST localhost:3000/v1/orders \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Authorization: Bearer $TOKEN" ...
```

## Testing

```bash
cd api

# Unit tests (pricing, state machine, OTP)
bun test

# Integration test (full order lifecycle E2E)
bun test tests/order-lifecycle.test.ts

# Manual test via seed + curl
curl -X POST http://localhost:3000/dev/seed/full | jq .
# Gunakan token dari response untuk test endpoint
```

## Environment Variables

### Backend (`api/.env`)

| Variable | Required | Deskripsi |
|----------|----------|-----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars untuk production |
| `FIREBASE_PROJECT_ID` | ❌ | FCM push notification |
| `FIREBASE_CLIENT_EMAIL` | ❌ | Service account email |
| `FIREBASE_PRIVATE_KEY` | ❌ | Service account key |
| `MIDTRANS_SERVER_KEY` | ❌ | QRIS payment (stub tanpa ini) |
| `MIDTRANS_CLIENT_KEY` | ❌ | Client-side key |
| `MIDTRANS_IS_PRODUCTION` | ❌ | `false` untuk sandbox |
| `QRIS_WEBHOOK_SECRET` | ❌ | Webhook signature verification |

## Model Harga

| Skema | Tarif | Min |
|-------|-------|-----|
| Per Jam | Rp 30.000/jam | 2 jam |
| Per Hari | Rp 150.000/hari | 1 hari |
| Ongkos Jalan | Rp 1.000/km | Min Rp 5.000, max Rp 50.000 |

**Surcharge:** Libur nasional +50%, Malam +30%, Weekend +20%, Urgent +Rp 25.000, Lantai >3 +Rp 10.000/lantai

### Biaya Pembatalan

| Status saat dibatalkan | Biaya |
|---|---|
| `PENDING`, `MATCHED`, `ACCEPTED` | Gratis — tukang belum berangkat |
| `EN_ROUTE` | Ongkos jalan penuh, seluruhnya jadi kompensasi tukang |

> ⚠️ Angka ini **default yang masuk akal, bukan kebijakan final**. Lihat catatan di
> `api/src/modules/orders/cancellation.ts` untuk pertanyaan yang perlu diputuskan
> sebelum peluncuran.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Bun + TypeScript strict + Hono + Prisma |
| Database | PostgreSQL 16 + PostGIS |
| Mobile | Flutter 3 + Riverpod + go_router + Dio |
| Admin | React 18 + Vite + react-router-dom |
| Real-time | Bun native WebSocket |
| Payment | Midtrans QRIS (Core API) |
| Push Notif | Firebase Cloud Messaging (HTTP v1) |
| Container | Docker Compose |

## Status Proyek

- ✅ Backend API lengkap (auth, orders, pricing, payments, matching, upload, notifications)
- ✅ WebSocket real-time (order tracking + worker location)
- ✅ Flutter app scaffold (22 screens, full flow)
- ✅ Admin panel (7 halaman: dashboard, workers, orders, disputes, reports, seed data, settings)
- ✅ Docker Compose (PostgreSQL + API + Admin)
- ✅ Integration tests (full order lifecycle E2E)
- 🔲 Firebase Console setup (butuh account)
- 🔲 Midtrans production approval (butuh badan usaha)
- 🔲 Google Play / App Store submission

## Lisensi

Private — Hak Cipta © 2026 TukangNDeso
