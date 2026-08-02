# TukangNDeso — Operasional Mojokerto Kabupaten

## Area Layanan

**Lokasi:** Kabupaten Mojokerto, Jawa Timur (di luar Kota Mojokerto).

**18 Kecamatan Kabupaten Mojokerto:**

| # | Kecamatan | Prioritas |
|---|-----------|-----------|
| 1 | Mojosari | Tinggi (ibu kota kab, pusat aktivitas) |
| 2 | Sooko | Tinggi (dekat Kota Mojokerto, populasi padat) |
| 3 | Puri | Tinggi (industri + perumahan) |
| 4 | Trowulan | Menengah (wisata + rumah tangga) |
| 5 | Jetis | Menengah (industri berat) |
| 6 | Ngoro | Menengah (kawasan industri) |
| 7 | Pungging | Menengah |
| 8 | Bangsal | Menengah |
| 9 | Mojoanyar | Menengah |
| 10 | Dlanggu | Rendah |
| 11 | Gedeg | Rendah |
| 12 | Kemlagi | Rendah |
| 13 | Dawarblandong | Rendah (jauh dari pusat) |
| 14 | Kutorejo | Rendah |
| 15 | Gondang | Rendah |
| 16 | Jatirejo | Rendah |
| 17 | Pacet | Rendah (wisata pegunungan) |
| 18 | Trawas | Rendah (wisata pegunungan) |

## Strategi Peluncuran

### Fase 1 — Pilot (Minggu 7)

Fokus **4 kecamatan prioritas tinggi + menengah dekat pusat**:

- Mojosari
- Sooko
- Puri
- Trowulan

Alasan: kepadatan penduduk tinggi, dekat dgn Kota Mojokerto, akses jalan bagus, potensi order per hari lebih tinggi. Target: 20-30 tukang aktif.

### Fase 2 — Ekspansi (Bulan 3-4)

Tambahkan kecamatan menengah:

- Jetis, Ngoro, Pungging, Bangsal, Mojoanyar

### Fase 3 — Full coverage (Bulan 6+)

Kecamatan pinggiran + Pacet & Trawas (untuk wisata + villa).

## Konfigurasi Area di Aplikasi

### Radius Layanan Maksimum

- **Default:** 25 km dari titik pelanggan
- **Alasan:** Radius kabupaten Mojokerto ± 25 km diameter. Di atas ini biaya perjalanan tidak masuk akal (>Rp 25.000 hanya untuk transport).
- **Enforcement:** endpoint `/pricing/estimate` menolak dgn `OUT_OF_SERVICE_AREA` jika jarak > 25 km.

### Bounding Box (untuk validasi lokasi)

```
Lat  : -7.60  s.d.  -7.35
Lng  : 112.35 s.d.  112.75
```

Lokasi di luar box ini otomatis ditolak saat booking (mencegah alamat salah input di luar kabupaten).

## Karakteristik Pasar Mojokerto Kabupaten

### Peluang

- **Populasi:** ± 1.1 juta jiwa (BPS 2023), banyak rumah tangga
- **Kawasan industri Ngoro, Jetis** — kos-kosan karyawan, banyak perbaikan AC & listrik
- **Trowulan** — wisata sejarah, banyak homestay + warung
- **Jarak antar kecamatan pendek** — cocok untuk model per jam
- **Kompetitor lokal minim** — mayoritas cari tukang lewat WA grup / kenalan

### Tantangan

- **Literasi digital rendah di beberapa area** — tukang usia 40+ butuh onboarding manual
- **QRIS belum familiar untuk sebagian tukang** — perlu edukasi cara cek pembayaran
- **Musim tanam padi (Feb-Apr, Agt-Okt)** — sebagian tukang beralih ke sawah
- **Jam kerja lokal:** biasanya berhenti setelah maghrib, weekend banyak yang libur

## Penyesuaian Tarif untuk Mojokerto

Tarif nasional generik perlu dicek ulang di lapangan. Berikut hipotesis awal:

| Item | Nasional (usulan) | Mojokerto Kab (hipotesis) |
|------|-------------------|---------------------------|
| Per jam | Rp 30.000 | **Rp 25.000-30.000** |
| Per hari | Rp 150.000 | **Rp 120.000-150.000** |
| Ongkos jalan | Rp 1.000/km | **Rp 1.500/km** (motor + BBM) |
| Minimum jam | 2 jam | 2 jam (tetap) |
| Surcharge malam | +30% | +20% (jam kerja lokal lebih pendek) |

**Wajib validasi di Hari 2 (wawancara 5 tukang + 5 pelanggan).** Angka final baru bisa ditetapkan setelah data lapangan masuk.

## Payment: QRIS

### Alur Bayar Pelanggan

1. Order selesai → tekan "Bayar" di app
2. App tampilkan **QR statis merchant TukangNDeso** dengan nominal dinamis
3. Pelanggan scan pakai app apapun (Dana, OVO, GoPay, ShopeePay, BCA, Mandiri, BRI, BNI, dll)
4. Konfirmasi bayar → webhook masuk → status `PAID` → saldo tukang bertambah

### Alur Cash (Fallback)

1. Bila QRIS gagal / pelanggan minta cash
2. Tukang tekan "Terima Cash" di app worker
3. Pelanggan konfirmasi "Sudah Bayar" di app customer
4. Status `PAID` — tapi platform harus tagih fee via top-up dari saldo tukang

### QRIS Provider (perlu dipilih)

| Provider | Kelebihan | Kekurangan |
|----------|-----------|------------|
| **Midtrans** | Dokumentasi bagus, banyak yang pakai, MDR 0.7% | Perlu badan usaha |
| **Xendit** | Support QRIS + fitur payout langsung | MDR sekitar 0.7% |
| **DANA Bisnis** | Fee lebih rendah, integrasi cepat | Hanya untuk yang punya bisnis terdaftar |
| **iPaymu / DOKU** | Alternatif lokal | Ekosistem lebih kecil |

**Rekomendasi:** mulai dengan **Midtrans** (dokumentasi paling matang, komunitas Indonesia besar).

### Biaya Transaksi (MDR QRIS)

- **Reguler (UMI < 500rb):** 0.3%
- **Reguler (UMI > 500rb):** 0.7%
- **Merchant PSO/pendidikan/SPBU:** 0%

Untuk order rata-rata Rp 100rb-200rb: fee QRIS Rp 300-1.400 per transaksi.

**Keputusan:** MDR ditanggung platform (bukan tukang atau pelanggan) di fase pilot supaya tidak menambah friksi.

## Kanal Rekrutmen Tukang

1. **Kunjungan langsung** ke bengkel AC / toko material di Mojosari & Sooko
2. **Grup WA "Tukang Mojokerto"** — cari admin, kenalan, tawarkan referral bonus
3. **Facebook group** komunitas Mojokerto
4. **Poster** di kelurahan & pasar tradisional
5. **Referral tukang → tukang** — bonus Rp 25.000 per referral yang aktif

## Kanal Akuisisi Pelanggan

1. **Poster di perumahan besar** (Sooko, Puri)
2. **Facebook ads** targeting Mojokerto radius 20 km
3. **WA broadcast** ke database RT/RW (jika ada akses via kader)
4. **Partnership dgn kos-kosan** industri Ngoro & Jetis
5. **Voucher first order** Rp 20.000 potongan

## KPI Khusus Pilot Mojokerto

| KPI | Target Bulan 1 | Target Bulan 3 |
|-----|----------------|----------------|
| Tukang aktif | 20 | 60 |
| Pelanggan terdaftar | 100 | 500 |
| Order/hari | 3-5 | 20-30 |
| Coverage kecamatan | 4 | 9 |
| Order sukses (bayar QRIS) | ≥60% dari total order | ≥85% |
| Waktu matching | <15 menit | <10 menit |
