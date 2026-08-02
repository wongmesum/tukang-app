# TukangNDeso — MVP Roadmap

## Prinsip

- **MVP dulu, feature lengkap belakangan** — validasi cepat di Mojokerto Kabupaten
- Fokus 1 kategori dulu (misal AC), lalu ekspansi
- Backend & app dikerjakan paralel setelah kontrak API disepakati

## Fase 0 — Persiapan (Minggu 1)

- [ ] Review & approve semua dokumen di `docs/`
- [ ] Finalisasi model harga (dgn contoh kasus real)
- [ ] Siapkan repo git (mono-repo: `app/`, `api/`, `admin/`)
- [ ] Setup env: Flutter, Node.js/Bun, PostgreSQL+PostGIS, Redis
- [ ] Pilih layanan pihak ketiga:
  - [ ] SMS OTP gateway (Zenziva/Twilio/Fonnte WA)
  - [ ] Peta (Google Maps / Mapbox)
  - [ ] QRIS provider (Midtrans/Xendit/DANA Bisnis)
  - [ ] Storage foto (S3/Cloudinary/Supabase Storage)
  - [ ] Push notif (FCM)

## Fase 1 — Backend Foundation (Minggu 2-3)

- [ ] Setup project Node.js/Bun + Express/Hono/Fastify + TypeScript strict
- [ ] Migrations semua tabel (Prisma/Drizzle)
- [ ] Seed data: kategori + services default (30 service dasar)
- [ ] Auth: OTP request/verify + JWT
- [ ] Users: profil + addresses CRUD
- [ ] Services: list + detail
- [ ] Pricing calculator (unit test wajib untuk formula)
- [ ] Upload endpoint

**Deliverable:** API bisa dipanggil via Postman, unit test pass.

## Fase 2 — Customer App MVP (Minggu 4-5)

- [ ] Setup Flutter project (Riverpod, go_router, Dio)
- [ ] Splash + Onboarding + Auth flow
- [ ] Home + Category + Service list
- [ ] Booking form + Price estimate
- [ ] Order tracking (polling dulu, WS nanti)
- [ ] Payment QRIS + cash sebagai fallback
- [ ] Rating + Review

**Deliverable:** APK internal testing, bisa order dari HP.

## Fase 3 — Worker App + Matching (Minggu 6-7)

- [ ] Endpoint order matching (query PostGIS: worker dalam radius + skill sesuai + is_available)
- [ ] Worker registration + admin approval flow
- [ ] Worker app: dashboard, incoming order, active order
- [ ] WebSocket untuk notifikasi order + location update
- [ ] Wallet + transaksi otomatis saat order paid

**Deliverable:** End-to-end order dari customer → matched → dikerjakan tukang → selesai.

## Fase 4 — Payment & Polish (Minggu 8)

- [ ] Integrasi QRIS production (dynamic QR per transaksi)
- [ ] Push notification (FCM)
- [ ] Chat customer ↔ worker
- [ ] Cancellation flow + refund
- [ ] Dispute basic (lapor ke admin via WA/email)

**Deliverable:** Aplikasi siap soft launch di Mojokerto Kabupaten.

## Fase 5 — Admin Panel (Minggu 9)

- [ ] Web admin sederhana (Next.js atau Retool)
- [ ] Verifikasi tukang
- [ ] Monitor order aktif
- [ ] Handle dispute
- [ ] Laporan basic (order/hari, revenue, top workers)

## Fase 6 — Soft Launch (Minggu 10)

- [ ] Rekrut 20-30 tukang di 1 kecamatan Mojokerto Kab
- [ ] Onboarding tukang (training pakai app, foto profil, KTP)
- [ ] Marketing lokal (poster, WA broadcast, testimoni)
- [ ] Monitor & fix bug harian
- [ ] Kumpulkan feedback

## Post-MVP (Bulan 3+)

- Multi kategori aktif
- Perluas kota
- Loyalty program (voucher, cashback)
- Subscription customer (paket bulanan servis AC)
- B2B (kontrak dgn perumahan/apartemen)
- Referral tukang
- Rating trust score untuk auto-priority
- Chat dgn foto + voice note
- Estimasi selesai berbasis histori pekerjaan sejenis

## Ukuran Tim Minimum

| Peran | Fase 1-3 | Fase 4+ |
| ------- | ---------- | --------- |
| Backend | 1 | 2 |
| Flutter (customer) | 1 | 1 |
| Flutter (worker) | (bareng customer) | 1 |
| Admin/Web | — | 1 |
| Designer | 0.5 (part-time) | 0.5 |
| PM/Ops | 1 | 1 |

Total 3-4 orang untuk MVP, tumbuh 6 orang saat post-launch.

## Estimasi Biaya Infrastruktur (per bulan, tahap awal)

| Item | Perkiraan |
| ------ | ----------- |
| VPS backend (2vCPU/4GB) | Rp 250.000 |
| PostgreSQL managed (basic) | Rp 400.000 |
| Redis | Rp 150.000 |
| S3/storage foto (50GB) | Rp 100.000 |
| Google Maps API | Rp 300.000-1.000.000 (tergantung volume) |
| SMS/WA OTP | Rp 200 × jumlah OTP |
| Push notif (FCM) | Gratis |
| Domain + SSL | Rp 20.000 |
| **Total baseline** | **~Rp 1.500.000 - 2.500.000/bulan** |
