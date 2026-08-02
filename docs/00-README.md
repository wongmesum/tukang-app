# TukangNDeso — Dokumen Perencanaan

Referensi konsep: [situkang.com/tukang-bangunan](https://situkang.com/tukang-bangunan)

Aplikasi Android marketplace jasa layanan tukang (AC, bangunan, listrik, plumbing, dll) dengan skema tarif per jam / per hari, biaya perjalanan berdasarkan jarak, dan matching berbasis lokasi.

## Struktur Dokumen

| File | Isi |
| ------ | ----- |
| [01-product-overview.md](01-product-overview.md) | Ringkasan produk, kategori, model harga, target user |
| [02-user-flows.md](02-user-flows.md) | Alur pelanggan, tukang, status order |
| [03-database-schema.md](03-database-schema.md) | Skema PostgreSQL + PostGIS |
| [04-api-endpoints.md](04-api-endpoints.md) | REST API + WebSocket + error codes |
| [05-app-screens.md](05-app-screens.md) | Daftar layar customer & worker, komponen, design system |
| [06-mvp-roadmap.md](06-mvp-roadmap.md) | Fase pengembangan mingguan + estimasi biaya |
| [07-daily-execution-plan.md](07-daily-execution-plan.md) | Rencana kerja harian 49 hari (detail per hari) |
| [08-mojokerto-operations.md](08-mojokerto-operations.md) | Area layanan, strategi launch, tarif lokal, QRIS, rekrutmen |

## Ringkasan Cepat

**Model Harga**

- Per jam: **Rp 30.000/jam** (min 2 jam)
- Per hari: **Rp 150.000/hari** (8 jam kerja)
- Ongkos jalan: **Rp 1.000/km** (min Rp 5.000, maks Rp 50.000)
- Surcharge: hari libur +50%, malam +30%, weekend +20%, urgent +Rp 25.000, lantai >3 +Rp 10.000/lantai

**Contoh:** Tukang AC 3 jam, jarak 12 km, hari biasa = `(3×30.000) + (12×1.000)` = **Rp 102.000**

**Tech Stack (usulan)**

- App: Flutter + Riverpod + go_router + Dio
- Backend: Node.js/Bun + TypeScript strict + Hono/Fastify
- Database: PostgreSQL + PostGIS
- Realtime: WebSocket
- Storage: S3-compatible
- Payment: QRIS (via Midtrans/Xendit/DANA)
- Maps: Google Maps

## Langkah Selanjutnya

1. Anda review 6 dokumen di atas
2. Beri tanda mana yang mau disesuaikan (harga, kategori, alur, dll)
3. Setelah spec disetujui → pilih tech stack final → mulai koding Fase 1

## Keputusan Bisnis (Disetujui)

- [x] Model bisnis: **Marketplace** — pelanggan cari & booking tukang via app
- [x] Area launch: **Mojokerto Kabupaten**, Jawa Timur
- [x] Payment: **QRIS** (standar nasional, semua e-wallet & bank kompatibel)
- [x] Nama & branding: **TukangNDeso**

## Pertanyaan Terbuka (Masih Perlu Keputusan)

- [ ] Fee platform: potong berapa % dari tukang? (saat ini tarif 100% ke tukang)
- [ ] Domain final: `tukangndeso.id` / `tukangndeso.com` / lain?
- [ ] QRIS provider: Midtrans / Xendit / DANA Bisnis / lain?
