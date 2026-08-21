# Deployment uji coba

Repository ini menyediakan dua workflow GitHub Actions:

- **Build Android APK** menghasilkan APK release sebagai artifact.
- **Deploy Admin to GitHub Pages** membangun dan menerbitkan admin Next.js sebagai situs statis.

## 1. Siapkan backend

Admin web dan APK memerlukan backend publik dengan HTTPS. Backend berada di folder `api/` dan membutuhkan:

- PostgreSQL dengan PostGIS
- Redis
- environment variables dari `api/.env.example`
- container yang dibangun dari `api/Dockerfile`

Pastikan endpoint berikut berhasil sebelum membangun klien:

```text
https://URL-BACKEND/health
```

## 2. Tambahkan Repository Variables

Buka **Settings → Secrets and variables → Actions → Variables**, lalu tambahkan:

| Variable | Contoh | Catatan |
| --- | --- | --- |
| `API_BASE_URL` | `https://api.tukangndeso.example` | Tanpa `/v1`; digunakan APK |
| `NEXT_PUBLIC_API_URL` | `https://api.tukangndeso.example/v1` | Dengan `/v1`; digunakan admin |

Jangan menyimpan password, JWT secret, atau server key sebagai variable biasa. Rahasia backend harus disimpan sebagai secret pada layanan hosting backend.

## 3. Unduh APK

1. Buka tab **Actions**.
2. Pilih **Build Android APK**.
3. Klik **Run workflow**.
4. Tunggu job selesai.
5. Unduh artifact **TukangNDeso-APK** dari halaman workflow run.

Folder Android dibuat otomatis saat build apabila belum ada di repository. APK memakai URL dari input manual, lalu `API_BASE_URL`, lalu alamat emulator sebagai fallback.

## 4. Aktifkan admin web

1. Buka **Settings → Pages**.
2. Pada **Build and deployment**, pilih **GitHub Actions**.
3. Buka tab **Actions**.
4. Jalankan **Deploy Admin to GitHub Pages**.

Alamat project site:

```text
https://wongmesum.github.io/tukang-app/
```

GitHub Pages hanya menyediakan admin statis; backend tetap harus berjalan di layanan server terpisah. Ketersediaan Pages untuk repository privat bergantung pada paket GitHub akun/organisasi.
