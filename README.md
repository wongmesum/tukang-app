# TukangNDeso

Marketplace jasa tukang untuk wilayah Mojokerto Kabupaten.

Lihat dokumentasi lengkap di [`docs/`](docs/00-README.md).

## Struktur

```
tukang-app/
├── api/       — Backend (TypeScript + Hono + Prisma)
├── app/       — Mobile (Flutter) [coming soon]
├── admin/     — Admin panel [coming soon]
└── docs/      — Spesifikasi produk
```

## Quick Start (Backend)

```bash
cd api
bun install
cp .env.example .env
bun test           # run pricing calculator tests
bun dev            # start dev server on :3000
```
