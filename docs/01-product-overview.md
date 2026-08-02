# TukangNDeso — Product Overview

## Ringkasan Produk

Aplikasi marketplace jasa tukang yang menghubungkan pelanggan dengan tukang terdekat di wilayah **Mojokerto Kabupaten**, Jawa Timur. Pelanggan bisa memesan layanan per jam atau per hari, dengan biaya perjalanan otomatis berdasarkan jarak. Pembayaran via **QRIS** (kompatibel semua e-wallet & mobile banking).

## Kategori Layanan

| Kode | Kategori | Contoh Pekerjaan |
| ------ | ---------- | ------------------ |
| AC | AC & Pendingin | Pasang, cuci, isi freon, perbaikan, bongkar |
| BGN | Bangunan | Renovasi, plester, keramik, pengecatan, atap |
| LST | Listrik | Instalasi, perbaikan, tambah daya, panel |
| PLB | Plumbing/Pipa | Saluran mampet, instalasi pipa, WC, pompa |
| LAS | Las & Besi | Pagar, kanopi, teralis, railing |
| TKY | Tukang Kayu | Kusen, lemari, plafon, partisi |
| CLN | Cleaning | Bersih rumah, poles lantai, buang puing |
| CAT | Cat & Finishing | Pengecatan interior/eksterior, waterproofing |
| TNM | Taman | Landscaping, potong rumput, kolam |

## Model Harga

### Tarif Dasar

| Skema | Tarif | Keterangan |
|-------|-------|------------|
| Per Jam | Rp 30.000/jam | Minimum 2 jam |
| Per Hari (Harian) | Rp 150.000/hari | 8 jam kerja (08:00-16:00) |

### Biaya Perjalanan

- **Formula:** `jarak_km × Rp 1.000`
- **Minimum:** Rp 5.000 (jarak < 5 km tetap Rp 5.000)
- **Maksimum:** Rp 50.000 (jarak > 50 km ditolak, di luar area)

### Biaya Tambahan (Surcharge)

| Kondisi | Tambahan |
| --------- | ---------- |
| Hari libur nasional | +50% tarif dasar |
| Malam (18:00-06:00) | +30% tarif dasar |
| Weekend (Sabtu-Minggu) | +20% tarif dasar |
| Urgent (< 2 jam dari booking) | +Rp 25.000 flat |
| Lantai > 3 (tanpa lift) | +Rp 10.000/lantai |

### Formula Total

```
total = tarif_dasar + biaya_perjalanan + surcharge
```

**Contoh:**

- Tukang AC, 3 jam, jarak 12 km, hari biasa
- = (3 × 30.000) + (12 × 1.000) + 0
- = 90.000 + 12.000
- = **Rp 102.000**

## Target User

### Pelanggan (Customer)

- Pemilik rumah/ruko
- Pengelola kos/apartemen
- Kantor kecil-menengah

### Tukang (Worker)

- Tukang independen
- Mandor dengan tim kecil
- Teknisi AC/listrik freelance

## Unique Value Proposition

1. **Transparan** — harga terlihat sebelum booking, tidak ada negosiasi ribet
2. **Terdekat** — matching berbasis lokasi, tukang datang lebih cepat
3. **Fleksibel** — per jam untuk pekerjaan kecil, harian untuk proyek
4. **Terjamin** — rating, review, dan garansi pengerjaan ulang
