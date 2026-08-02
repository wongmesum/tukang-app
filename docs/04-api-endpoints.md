# TukangNDeso — REST API

Base URL: `https://api.tukangndeso.id/v1`
Auth: `Authorization: Bearer <jwt>`
Response format: `{ success, data?, error?, meta? }`

## Auth

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| POST | `/auth/otp/request` | Kirim OTP ke nomor HP |
| POST | `/auth/otp/verify` | Verifikasi OTP → JWT |
| POST | `/auth/register` | Lengkapi profil setelah OTP |
| POST | `/auth/refresh` | Refresh JWT |
| POST | `/auth/logout` | Invalidate token |

**POST `/auth/otp/request`**

```json
{ "phone": "081234567890" }
```

**POST `/auth/otp/verify`**

```json
{ "phone": "081234567890", "code": "123456" }
```

→ `{ token, refresh_token, user }`

## Users & Profil

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| GET | `/me` | Profil user login |
| PATCH | `/me` | Update profil |
| GET | `/me/addresses` | List alamat |
| POST | `/me/addresses` | Tambah alamat |
| PATCH | `/me/addresses/:id` | Update alamat |
| DELETE | `/me/addresses/:id` | Hapus alamat |

## Layanan (Public)

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| GET | `/categories` | List kategori aktif |
| GET | `/categories/:code/services` | List layanan per kategori |
| GET | `/services/:id` | Detail layanan |

## Estimasi Harga

**POST `/pricing/estimate`**

```json
{
  "service_id": "uuid",
  "pricing_scheme": "hourly",
  "duration": 3,
  "customer_location": { "lat": -6.2, "lng": 106.8 },
  "scheduled_at": "2026-07-30T20:00:00+07:00",
  "floor_level": 1,
  "is_urgent": false
}
```

Response:

```json
{
  "base_rate": 90000,
  "distance_km": 12.4,
  "travel_cost": 12400,
  "surcharge": {
    "night": 27000,
    "weekend": 0,
    "holiday": 0,
    "urgent": 0,
    "floor": 0
  },
  "total_estimate": 129400,
  "breakdown_text": "Tarif 3 jam × Rp30.000 + Ongkos 12.4 km + Malam +30%"
}
```

## Orders (Customer)

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| POST | `/orders` | Buat order baru |
| GET | `/orders` | Riwayat order customer |
| GET | `/orders/:id` | Detail order |
| POST | `/orders/:id/cancel` | Batal (dgn alasan) |
| POST | `/orders/:id/confirm` | Konfirmasi selesai |
| POST | `/orders/:id/pay` | Generate QRIS untuk order |
| POST | `/orders/:id/review` | Kirim rating |

**POST `/orders`**

```json
{
  "service_id": "uuid",
  "pricing_scheme": "hourly",
  "estimated_duration": 3,
  "description": "AC bocor di kamar utama",
  "photos": ["url1", "url2"],
  "address_id": "uuid",
  "scheduled_at": null,
  "is_urgent": false
}
```

## Orders (Worker)

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| GET | `/worker/orders/incoming` | Order yang di-assign |
| GET | `/worker/orders/active` | Order berjalan |
| GET | `/worker/orders/history` | Riwayat |
| POST | `/worker/orders/:id/accept` | Terima order |
| POST | `/worker/orders/:id/reject` | Tolak order |
| POST | `/worker/orders/:id/arrive` | Konfirmasi tiba |
| POST | `/worker/orders/:id/start` | Mulai kerja |
| POST | `/worker/orders/:id/complete` | Selesai |

## Worker Profile

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| POST | `/worker/register` | Daftar sebagai tukang |
| GET | `/worker/profile` | Profil tukang |
| PATCH | `/worker/profile` | Update profil |
| POST | `/worker/availability` | Toggle online/offline |
| GET | `/worker/wallet` | Saldo & transaksi |
| POST | `/worker/wallet/withdraw` | Tarik saldo |

**POST `/worker/availability`**

```json
{ "is_available": true, "current_location": { "lat": -6.2, "lng": 106.8 } }
```

## Realtime (WebSocket)

Endpoint: `wss://api.tukangndeso.id/v1/realtime`

Events dari server → client:

- `order.new_match` — order baru untuk tukang
- `order.status_changed` — perubahan status ke customer/worker
- `worker.location_update` — update posisi tukang ke customer saat en-route
- `chat.message` — pesan chat antara customer & worker

## Payment (QRIS)

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/payments/qris/create` | Buat dynamic QRIS untuk order |
| GET | `/payments/:id/status` | Cek status pembayaran |
| POST | `/payments/webhook/qris` | Webhook callback dari provider |
| POST | `/payments/:id/refund` | Refund (admin only) |

**POST `/payments/qris/create`**

```json
{ "order_id": "uuid" }
```

Response:

```json
{
  "payment_id": "uuid",
  "qr_string": "00020101021226...630401AB",
  "qr_image_url": "https://cdn.tukangndeso.id/qr/xxx.png",
  "amount": 129400,
  "expires_at": "2026-07-30T14:15:00+07:00",
  "status": "pending"
}
```

**Webhook `/payments/webhook/qris`** (dari Midtrans/Xendit/DANA)

- Verifikasi signature header wajib.
- Idempotent: order yang sudah `paid` diabaikan.
- Update `payments.status` → `paid` dan trigger kredit saldo tukang.

## Upload

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/upload/image` | Upload foto (multipart) |

Response: `{ url, size, mime_type }`

## Admin (Internal)

| Method | Path | Deskripsi |
| -------- | ------ | ----------- |
| GET | `/admin/workers/pending` | Tukang menunggu verifikasi |
| POST | `/admin/workers/:id/verify` | Approve tukang |
| POST | `/admin/workers/:id/suspend` | Suspend tukang |
| GET | `/admin/disputes` | List dispute |
| POST | `/admin/disputes/:id/resolve` | Resolve dispute |

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Kode OTP salah atau kadaluarsa"
  }
}
```

| Code | HTTP | Arti |
| ------ | ------ | ------ |
| VALIDATION_ERROR | 400 | Input tidak valid |
| UNAUTHORIZED | 401 | Token invalid/expired |
| FORBIDDEN | 403 | Tidak punya akses |
| NOT_FOUND | 404 | Resource tidak ada |
| CONFLICT | 409 | State conflict (misal double booking) |
| OUT_OF_SERVICE_AREA | 422 | Di luar radius layanan |
| NO_WORKER_AVAILABLE | 422 | Tidak ada tukang tersedia |
| SERVER_ERROR | 500 | Error internal |
