# TukangNDeso — User Flows

## Flow 1: Pelanggan Memesan Tukang

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Buka App → Home Screen                                       │
│ 2. Pilih Kategori (AC / Bangunan / Listrik / dst)               │
│ 3. Pilih Sub-layanan (misal: "Cuci AC Split")                   │
│ 4. Isi Detail:                                                  │
│    - Deskripsi masalah (opsional, + foto)                        │
│    - Alamat (auto-detect GPS / input manual)                     │
│    - Jadwal: Sekarang / Pilih tanggal-jam                        │
│    - Skema: Per Jam / Per Hari                                   │
│    - Estimasi durasi (jam/hari)                                  │
│ 5. Lihat Estimasi Harga (breakdown tarif + jarak + surcharge)    │
│ 6. Konfirmasi & Booking                                         │
│ 7. Sistem cari tukang terdekat yang available                    │
│ 8. Tukang menerima → status "Dalam Perjalanan"                  │
│ 9. Tukang tiba → tekan "Mulai Kerja"                            │
│ 10. Pekerjaan selesai → tekan "Selesai"                         │
│ 11. Pelanggan konfirmasi → Pembayaran                           │
│ 12. Rating & Review                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Flow 2: Tukang Menerima Order

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Notifikasi masuk: order baru di area                         │
│ 2. Lihat detail: kategori, lokasi, estimasi bayaran             │
│ 3. Terima / Tolak (timeout 3 menit → pindah tukang lain)       │
│ 4. Terima → navigasi ke lokasi pelanggan                        │
│ 5. Tiba → konfirmasi "Saya Sudah Tiba"                         │
│ 6. Mulai kerja → timer berjalan                                 │
│ 7. Selesai → upload foto hasil (opsional)                       │
│ 8. Pelanggan approve → saldo masuk                              │
└─────────────────────────────────────────────────────────────────┘
```

## Flow 3: Registrasi Tukang

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Download app → pilih "Daftar sebagai Tukang"                 │
│ 2. Input: Nama, HP, KTP (foto), Alamat                          │
│ 3. Pilih kategori keahlian (bisa multi)                         │
│ 4. Upload portofolio (foto pekerjaan sebelumnya)                │
│ 5. Set radius kerja (km dari rumah)                             │
│ 6. Verifikasi admin (24-48 jam)                                 │
│ 7. Approved → profil aktif, bisa terima order                   │
└─────────────────────────────────────────────────────────────────┘
```

## Flow 4: Registrasi Pelanggan

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Download app → "Daftar / Login"                              │
│ 2. OTP via SMS/WhatsApp (nomor HP)                              │
│ 3. Input: Nama, Alamat utama                                    │
│ 4. Langsung bisa booking                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Status Order (State Machine)

```
PENDING → MATCHED → ACCEPTED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED → PAID → REVIEWED
   │         │         │                                    │
   └→EXPIRED └→TIMEOUT └→CANCELLED_BY_WORKER         └→DISPUTED
         └→CANCELLED_BY_CUSTOMER
```

| Status | Trigger | Aksi |
| -------- | --------- | ------ |
| PENDING | Customer submit order | Cari tukang terdekat |
| MATCHED | Sistem assign tukang | Tunggu accept/reject |
| ACCEPTED | Tukang accept | Mulai navigasi |
| EN_ROUTE | Tukang berangkat | Tracking real-time |
| ARRIVED | Tukang tekan "Tiba" | Konfirmasi pelanggan |
| IN_PROGRESS | Timer mulai | Tracking durasi |
| COMPLETED | Tukang tekan "Selesai" | Tunggu approval |
| PAID | Pelanggan bayar | Dana masuk saldo tukang |
| REVIEWED | Rating diberikan | Order selesai |
| DISPUTED | Ada masalah | Admin handle |
