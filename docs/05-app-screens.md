# TukangNDeso — Daftar Layar & Komponen

Stack disarankan: **Flutter** + **Riverpod** (state) + **go_router** (navigasi) + **Dio** (HTTP).

## A. Pelanggan (Customer)

### 1. Splash & Onboarding

- **SplashScreen** — logo + cek token
- **OnboardingScreen** — 3 slide (perkenalan, kategori, harga transparan)

### 2. Auth

- **PhoneInputScreen** — input nomor HP
- **OtpVerifyScreen** — 6 digit OTP
- **CompleteProfileScreen** — nama + alamat pertama

### 3. Home

- **HomeScreen** — search bar, banner promo, grid kategori (9 kategori), section "Tukang terdekat", "Order berjalan"
- **CategoryListScreen** — semua kategori dgn ikon
- **ServiceListScreen** — daftar sub-layanan per kategori

### 4. Booking Flow

- **ServiceDetailScreen** — deskripsi + tarif dasar
- **BookingFormScreen** — deskripsi masalah, foto, alamat, jadwal, skema (jam/hari), durasi
- **PriceEstimateScreen** — breakdown harga + tombol "Cari Tukang"
- **SearchingWorkerScreen** — loading animasi "mencari tukang terdekat…" dgn timeout 60 detik
- **BookingConfirmedScreen** — order berhasil, redirect ke tracking

### 5. Order Tracking

- **OrderTrackingScreen** — peta real-time posisi tukang, ETA, status, tombol chat/call
- **ChatScreen** — pesan dgn tukang
- **OrderDetailScreen** — semua info order (baca-tulis tergantung status)

### 6. Payment & Review

- **PaymentScreen** — tampilkan QRIS (dynamic QR) atau opsi bayar cash, konfirmasi jumlah
- **ReviewScreen** — bintang 1-5, komentar, upload foto hasil

### 7. Profile

- **ProfileScreen** — foto, nama, menu (alamat, order, pembayaran, bantuan, logout)
- **AddressListScreen** — kelola alamat
- **AddressEditScreen** — form alamat + peta
- **OrderHistoryScreen** — list order lama
- **HelpScreen** — FAQ + kontak CS

## B. Tukang (Worker)

### 1. Auth & Registrasi

- **WorkerRegisterScreen** — nama, HP, KTP, alamat, kategori keahlian, radius kerja
- **WorkerPendingVerificationScreen** — status "menunggu verifikasi admin"

### 2. Dashboard

- **WorkerHomeScreen** — toggle online/offline, saldo hari ini, jumlah order, rating rata-rata, map area
- **IncomingOrderScreen** (modal/full) — detail order masuk, tombol Terima/Tolak, countdown 3 menit

### 3. Active Order

- **WorkerOrderTrackingScreen** — navigasi ke lokasi customer (buka Google Maps), tombol "Saya Tiba"
- **WorkerOrderInProgressScreen** — timer durasi kerja, tombol "Selesai", upload foto hasil

### 4. Wallet & History

- **WorkerWalletScreen** — saldo, tombol tarik, riwayat transaksi
- **WithdrawScreen** — form tarik (nomor rekening/e-wallet)
- **WorkerOrderHistoryScreen** — riwayat order + earning

### 5. Profile

- **WorkerProfileScreen** — edit profil, kategori keahlian, radius, foto portofolio
- **WorkerRatingScreen** — semua review dari pelanggan

## Komponen Reusable

| Komponen | Fungsi |
| ---------- | -------- |
| `PriceBreakdownCard` | Tampilkan breakdown harga (base + travel + surcharge) |
| `CategoryIconTile` | Tile kategori dgn ikon + nama |
| `OrderStatusBadge` | Badge warna sesuai status order |
| `WorkerCard` | Ringkasan tukang (foto, nama, rating, jarak) |
| `LocationPicker` | Widget pilih lokasi (map + search) |
| `PhotoUploader` | Multi-foto uploader dgn preview |
| `RatingStars` | Bintang interaktif 1-5 |
| `ChatBubble` | Bubble chat customer/worker |
| `MapTracking` | Widget peta dgn marker posisi tukang |

## Design System (Ringkas)

**Warna**

- Primary: `#FF6B35` (oranye — kesan energik, kerja lapangan)
- Secondary: `#2C3E50` (navy — profesional)
- Success: `#27AE60`
- Warning: `#F39C12`
- Danger: `#E74C3C`
- Background: `#F8F9FA`
- Text: `#2C3E50` / `#7F8C8D`

**Font**

- Heading: Inter Bold
- Body: Inter Regular
- Numeric (harga, timer): Inter Medium tabular

**Spacing:** 4, 8, 12, 16, 24, 32, 48 (kelipatan 4)
**Radius:** 8 (kartu kecil), 12 (kartu besar), 24 (tombol pill)

## Navigasi

**Customer bottom nav:** Home · Order · Chat · Profile
**Worker bottom nav:** Dashboard · Order · Wallet · Profile
