# TukangNDeso — Rencana Kerja Harian

Rencana ini memakai asumsi tim minimum: 1 backend, 1 Flutter, 1 product/QA merangkap operasional. Durasi dapat diperpanjang jika dikerjakan sendiri.

## Minggu 1 — Validasi Produk dan Setup

### Hari 1 — Tetapkan ruang lingkup

- Putuskan kota/kecamatan peluncuran pertama.
- Pilih kategori awal; rekomendasi: AC dan bangunan ringan.
- Tetapkan apakah tukang membawa material sendiri atau hanya tenaga kerja.
- Tulis 10 contoh order nyata dari pelanggan potensial.
- Output: daftar fitur MVP dan daftar fitur yang ditunda.

### Hari 2 — Validasi harga lapangan

- Wawancarai minimal 5 tukang dan 5 calon pelanggan.
- Validasi tarif Rp30.000/jam dan Rp150.000/hari.
- Validasi apakah ongkos jarak Rp1.000/km realistis; tetapkan siapa yang menanggungnya.
- Tentukan minimum tarif, radius maksimum, pembatalan, dan biaya tunggu.
- Output: price book v1 yang disetujui.

### Hari 3 — Finalisasi alur bisnis

- Gambar alur booking pelanggan.
- Gambar alur menerima order tukang.
- Tetapkan aturan timeout, pembatalan, refund, dan dispute.
- Tetapkan kapan timer kerja dimulai dan berhenti.
- Output: state machine order dan aturan transisi.

### Hari 4 — Prototipe UX

- Buat wireframe Home, Service Detail, Booking, Estimasi, Tracking, dan Review.
- Buat wireframe Dashboard Tukang dan Order Masuk.
- Uji prototipe kepada minimal 3 orang.
- Catat istilah yang membingungkan, terutama "per jam", "per hari", dan "ongkos jalan".
- Output: prototype low-fidelity yang telah direvisi.

### Hari 5 — Keputusan teknis

- Finalisasi Flutter, backend TypeScript, PostgreSQL/PostGIS, storage, maps, OTP, dan payment.
- Buat diagram deployment sederhana.
- Buat daftar environment variable tanpa memasukkan secret ke git.
- Tetapkan strategi polling MVP; WebSocket dapat menyusul.
- Output: dokumen keputusan teknis dan backlog prioritas.

### Hari 6 — Setup repository

- Buat struktur `app/`, `api/`, `admin/`, dan `docs/`.
- Aktifkan TypeScript strict pada backend.
- Tambahkan formatter, linter, test runner, dan pre-commit check.
- Buat `.env.example` serta aturan secret management.
- Output: repository dapat di-clone dan dijalankan oleh semua anggota tim.

### Hari 7 — Review dan buffer

- Review seluruh dokumen bersama stakeholder.
- Perbaiki keputusan yang belum konsisten.
- Buat seed data kategori dan layanan.
- Sisakan waktu untuk hambatan setup.
- Gate: jangan mulai implementasi jika formula harga dan status order belum disetujui.

## Minggu 2 — Backend Foundation

### Hari 8 — Database dan migrasi

- Buat schema users, addresses, worker profiles, categories, services, orders, pricing, payments, dan reviews.
- Aktifkan extension PostGIS.
- Tambahkan foreign key, unique constraint, check constraint, dan index.
- Buat migration rollback.
- Tambahkan test migration pada database sementara.

### Hari 9 — Seed dan repository

- Masukkan kategori dan sub-layanan awal.
- Buat repository untuk user, address, service, dan worker.
- Pastikan query lokasi memakai parameter terikat, bukan string interpolation.
- Tambahkan test untuk query radius dan filter skill.

### Hari 10 — Auth OTP

- Implementasi request OTP dengan rate limit per nomor dan IP.
- Simpan OTP dalam bentuk hash dengan masa berlaku singkat.
- Implementasi verifikasi, JWT access token, refresh token, dan logout.
- Uji OTP benar, salah, kedaluwarsa, dan terlalu banyak percobaan.

### Hari 11 — Profil dan alamat

- Implementasi `GET/PATCH /me`.
- Implementasi CRUD alamat.
- Validasi latitude, longitude, nomor telepon, dan alamat wajib.
- Tambahkan default address dengan aturan hanya satu alamat default.

### Hari 12 — Kategori dan layanan

- Implementasi endpoint kategori dan layanan.
- Tambahkan filter aktif/nonaktif.
- Buat response contract yang konsisten.
- Tambahkan OpenAPI atau koleksi API untuk pengujian manual.

### Hari 13 — Kalkulator harga: RED

- Tulis unit test untuk tarif per jam, per hari, minimum jam, dan jarak.
- Tulis test surcharge malam, weekend, libur, urgent, dan lantai.
- Tulis test pembulatan jarak dan batas minimum/maksimum ongkos.
- Pastikan test gagal karena implementasi kalkulator belum ada.

### Hari 14 — Kalkulator harga: GREEN

- Implementasikan kalkulator harga murni tanpa akses database.
- Gunakan integer Rupiah untuk menghindari error pecahan uang.
- Implementasikan `POST /pricing/estimate`.
- Jalankan seluruh unit test dan test edge case.
- Gate: setiap total harus memiliki breakdown yang dapat dijelaskan ke pelanggan.

## Minggu 3 — Order dan Matching

### Hari 15 — Membuat order

- Implementasi `POST /orders`.
- Simpan snapshot tarif dan lokasi saat booking.
- Validasi service, alamat, jadwal, durasi, dan area layanan.
- Pastikan request duplikat tidak membuat order ganda.

### Hari 16 — Matching tukang

- Cari tukang aktif berdasarkan kategori, skill, radius, dan jarak.
- Urutkan berdasarkan jarak, rating, dan waktu sejak order terakhir.
- Batasi jumlah kandidat awal.
- Tambahkan fallback `NO_WORKER_AVAILABLE`.

### Hari 17 — State machine order

- Implementasikan transisi status yang diizinkan.
- Tolak transisi ilegal, misalnya `COMPLETED` langsung dari `PENDING`.
- Tambahkan audit log setiap perubahan status.
- Uji pembatalan pelanggan dan tukang.

### Hari 18 — Endpoint tukang

- Implementasikan incoming orders, accept, reject, arrive, start, dan complete.
- Terapkan optimistic locking agar dua tukang tidak menerima order yang sama.
- Tambahkan timeout penerimaan order.

### Hari 19 — Harga final dan penyelesaian

- Simpan durasi aktual dan harga final.
- Tetapkan aturan tambahan pekerjaan agar memerlukan persetujuan pelanggan.
- Implementasikan konfirmasi selesai pelanggan.
- Uji pekerjaan yang durasinya lebih lama dan lebih pendek dari estimasi.

### Hari 20 — Upload dan notifikasi dasar

- Implementasikan upload foto dengan tipe dan ukuran yang dibatasi.
- Tambahkan push notification untuk perubahan status.
- Jangan mencatat token, OTP, atau data KTP ke log.

### Hari 21 — Integrasi backend

- Jalankan alur end-to-end menggunakan Postman atau integration test.
- Uji customer → matching → worker accept → start → complete.
- Perbaiki kontrak response yang tidak konsisten.
- Gate: API MVP stabil sebelum UI terhubung penuh.

## Minggu 4 — Flutter Customer

### Hari 22 — Bootstrap aplikasi

- Buat project Flutter dengan flavor development dan production.
- Setup Riverpod, go_router, Dio, secure storage, logger, dan error boundary.
- Buat theme, typography, warna, spacing, dan komponen tombol.

### Hari 23 — Onboarding dan auth

- Implementasi splash dan pemeriksaan token.
- Implementasi input nomor, OTP, resend timer, dan profil awal.
- Tampilkan error user-facing dalam bahasa Indonesia.

### Hari 24 — Home dan katalog

- Implementasi Home, kategori, service list, dan service detail.
- Tambahkan loading, empty state, dan retry state.
- Hubungkan ke endpoint kategori dan layanan.

### Hari 25 — Alamat dan lokasi

- Implementasi daftar alamat dan tambah alamat.
- Tambahkan map picker serta permission location.
- Sediakan input manual jika GPS ditolak atau tidak akurat.

### Hari 26 — Form booking

- Implementasi deskripsi, foto, jadwal, skema harga, durasi, dan lantai.
- Validasi form sebelum request estimasi.
- Tampilkan ringkasan input sebelum lanjut.

### Hari 27 — Estimasi dan submit order

- Implementasikan price breakdown card.
- Tampilkan tarif dasar, jarak, surcharge, dan total.
- Tambahkan tombol submit dengan idempotency key.
- Tampilkan pesan jika tidak ada tukang tersedia.

### Hari 28 — Tracking dan status

- Implementasikan order tracking berbasis polling.
- Tampilkan status, detail tukang, ETA, call/chat placeholder, dan cancel.
- Pastikan polling berhenti saat halaman ditutup atau order selesai.

## Minggu 5 — Flutter Tukang

### Hari 29 — Registrasi tukang

- Implementasikan form profil, KTP, skill, radius, dan portofolio.
- Validasi ukuran dan tipe file.
- Tampilkan status menunggu verifikasi.

### Hari 30 — Dashboard tukang

- Implementasikan toggle online/offline.
- Tampilkan saldo, rating, order aktif, dan ringkasan hari ini.
- Minta konfirmasi sebelum mengaktifkan status online jika profil belum lengkap.

### Hari 31 — Incoming order

- Tampilkan detail order, jarak, estimasi bayaran, dan countdown.
- Implementasikan accept/reject.
- Tangani order kedaluwarsa dan konflik saat kandidat lain lebih dulu menerima.

### Hari 32 — Perjalanan dan mulai kerja

- Implementasikan navigasi eksternal ke Google Maps.
- Tombol "Saya Tiba" mengubah status menjadi `ARRIVED`.
- Tombol "Mulai Kerja" mengaktifkan timer server, bukan hanya timer perangkat.

### Hari 33 — Penyelesaian pekerjaan

- Implementasikan timer, foto hasil, catatan tambahan, dan selesai.
- Minta konfirmasi jika harga final berubah dari estimasi.
- Tampilkan status menunggu persetujuan pelanggan.

### Hari 34 — Wallet dan riwayat

- Tampilkan saldo, pendapatan, transaksi, dan riwayat order.
- Implementasikan permintaan tarik dana sebagai status pending.
- Jangan anggap saldo bertambah sebelum pembayaran sukses.

### Hari 35 — Review integrasi tukang

- Uji worker registration → approval → online → accept → complete.
- Uji aplikasi saat koneksi lambat dan aplikasi dibuka kembali.
- Perbaiki state recovery setelah force close.

## Minggu 6 — Payment, Admin, dan QA

### Hari 36 — Pembayaran cash (fallback)

- Implementasikan metode cash sebagai fallback jika QRIS gagal.
- Catat bukti pembayaran dan status secara eksplisit.
- Tambahkan larangan menutup order tanpa metode pembayaran.

### Hari 37 — Integrasi QRIS sandbox

- Integrasikan payment gateway penyedia QRIS (Midtrans/Xendit/DANA Bisnis) di lingkungan sandbox.
- Implementasikan generate dynamic QR per order dan webhook terverifikasi (idempotent).
- Uji sukses, gagal, kedaluwarsa QR, refund, dan callback ganda.

### Hari 38 — Admin panel minimum

- Buat login admin terpisah.
- Buat verifikasi tukang, daftar order aktif, dan daftar dispute.
- Pisahkan role admin dan jangan memakai akun pelanggan sebagai admin.

### Hari 39 — Cancellation dan dispute

- Tambahkan pilihan alasan pembatalan.
- Terapkan aturan biaya pembatalan setelah tukang berangkat.
- Buat tiket dispute dan lampiran bukti.
- Pastikan admin dapat mengubah resolusi dengan audit trail.

### Hari 40 — QA fungsional

- Jalankan test matrix customer, worker, admin, jaringan lambat, permission GPS, dan upload.
- Uji nominal Rp0, durasi minimum, jarak batas, order malam, weekend, dan libur.
- Verifikasi semua error user-facing berbahasa Indonesia.

### Hari 41 — Security dan privacy

- Periksa authorization setiap endpoint.
- Pastikan KTP dan foto privat memakai URL bertanda tangan atau akses terproteksi.
- Uji rate limit OTP, upload abuse, replay webhook, dan IDOR.
- Hapus secret dari repository dan log.

### Hari 42 — Release candidate

- Buat APK internal testing.
- Jalankan smoke test instalasi, login, booking, accept, selesai, dan review.
- Catat bug blocker dan lakukan perbaikan terakhir.
- Gate: hanya bug kritis yang boleh tersisa sebelum soft launch.

## Minggu 7 — Pilot Lapangan

### Hari 43 — Rekrut tukang

- Rekrut 20–30 tukang pada satu kecamatan di Mojokerto Kabupaten.
- Verifikasi identitas dan skill secara manual.
- Foto profil harus jelas dan seragam.

### Hari 44 — Pelatihan tukang

- Simulasikan menerima order, navigasi, timer, foto, selesai, dan dispute.
- Berikan SOP komunikasi dan larangan meminta pembayaran di luar aplikasi tanpa catatan.

### Hari 45 — Uji dengan pelanggan terbatas

- Ajak 5–10 pelanggan melakukan order nyata.
- Dampingi order pertama secara manual.
- Catat waktu matching, waktu tiba, harga, dan keluhan.

### Hari 46 — Perbaikan operasi

- Perbaiki area yang tidak memiliki tukang cukup.
- Tinjau ulang tarif perjalanan dan minimum order.
- Tambahkan FAQ berdasarkan pertanyaan berulang.

### Hari 47 — Monitoring

- Pantau order sukses, cancel, no-worker, waktu respons, dan rating.
- Buat dashboard sederhana atau laporan harian.
- Siapkan prosedur incident response.

### Hari 48 — Soft launch terbatas

- Buka pendaftaran untuk satu kecamatan di Mojokerto Kabupaten atau komunitas tertentu.
- Batasi kategori dan jumlah order harian jika operasional belum stabil.
- Sediakan kontak bantuan yang benar-benar aktif.

### Hari 49 — Evaluasi dan keputusan scale

- Bandingkan KPI dengan target.
- Putuskan: perbaiki produk, tambah tukang, ubah harga, atau perluas area.
- Bekukan fitur baru sampai masalah operasional utama selesai.

## KPI Pilot Minimum

| KPI | Target awal |
| ----- | ------------- |
| Order berhasil selesai | ≥80% dari order dibuat |
| Waktu menemukan tukang | <10 menit |
| Tukang tiba sesuai jadwal | ≥85% |
| Rating rata-rata | ≥4,3/5 |
| Pembatalan pelanggan | <15% |
| Pembatalan tukang | <10% |
| Sengketa | <5% |
| Crash-free session | ≥99% |

## Catatan Keputusan Harga

Angka dalam dokumen ini adalah **nilai awal yang harus divalidasi di lapangan**, bukan janji harga final. Sebelum peluncuran, tetapkan secara tertulis:

- Apakah `Rp1.000/km` dihitung satu arah atau pulang-pergi.
- Sumber perhitungan jarak: rute jalan atau garis lurus.
- Siapa yang membayar material, parkir, tol, dan biaya tambahan.
- Apakah tarif harian berlaku untuk delapan jam penuh atau jam kerja yang berbeda.
- Persentase fee platform dan apakah fee ditambahkan ke pelanggan atau dipotong dari tukang.
- Biaya MDR (merchant discount rate) QRIS ditanggung platform atau dipotong dari tukang.
- Mekanisme persetujuan pelanggan untuk pekerjaan tambahan.
