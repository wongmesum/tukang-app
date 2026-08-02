# TukangNDeso — Database Schema

## Tech: PostgreSQL + PostGIS (untuk geolocation)

---

## Tabel: `users`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| phone | VARCHAR(15) UNIQUE | Nomor HP (login) |
| name | VARCHAR(100) | Nama lengkap |
| email | VARCHAR(255) NULL | Opsional |
| avatar_url | TEXT NULL | |
| role | ENUM('customer','worker','admin') | |
| is_verified | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## Tabel: `addresses`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| label | VARCHAR(50) | "Rumah", "Kantor", etc |
| full_address | TEXT | Alamat lengkap |
| location | GEOGRAPHY(Point, 4326) | PostGIS lat/lng |
| district | VARCHAR(100) | Kecamatan |
| city | VARCHAR(100) | Kota |
| is_default | BOOLEAN | |

## Tabel: `worker_profiles`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| user_id | UUID (FK→users) UNIQUE | |
| ktp_number | VARCHAR(16) | |
| ktp_photo_url | TEXT | |
| bio | TEXT NULL | Deskripsi singkat |
| work_radius_km | INTEGER DEFAULT 20 | Radius mau kerja |
| home_location | GEOGRAPHY(Point, 4326) | Titik asal |
| is_available | BOOLEAN DEFAULT true | Online/offline |
| rating_avg | DECIMAL(2,1) DEFAULT 0 | |
| total_orders | INTEGER DEFAULT 0 | |
| verified_at | TIMESTAMPTZ NULL | |
| status | ENUM('pending','active','suspended') | |

## Tabel: `worker_skills`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| worker_id | UUID (FK→worker_profiles) | |
| category_code | VARCHAR(10) | AC, BGN, LST, etc |
| experience_years | INTEGER NULL | |

## Tabel: `service_categories`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| code | VARCHAR(10) (PK) | AC, BGN, LST, PLB, etc |
| name | VARCHAR(50) | "AC & Pendingin" |
| icon_url | TEXT | |
| is_active | BOOLEAN DEFAULT true | |

## Tabel: `services`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| category_code | VARCHAR(10) (FK) | |
| name | VARCHAR(100) | "Cuci AC Split" |
| description | TEXT NULL | |
| base_hourly_rate | INTEGER DEFAULT 30000 | Tarif per jam |
| base_daily_rate | INTEGER DEFAULT 150000 | Tarif per hari |
| min_hours | INTEGER DEFAULT 2 | Minimum jam |
| is_active | BOOLEAN DEFAULT true | |

## Tabel: `orders`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| order_number | VARCHAR(20) UNIQUE | "ORD-20260730-XXXX" |
| customer_id | UUID (FK→users) | |
| worker_id | UUID (FK→users) NULL | Assigned setelah match |
| service_id | UUID (FK→services) | |
| status | VARCHAR(20) | State machine |
| pricing_scheme | ENUM('hourly','daily') | |
| estimated_duration | INTEGER | Jam atau hari |
| description | TEXT NULL | Catatan pelanggan |
| photos | TEXT[] | Array URL foto masalah |
| address_id | UUID (FK→addresses) | Lokasi pekerjaan |
| customer_location | GEOGRAPHY(Point, 4326) | Snapshot lokasi order |
| scheduled_at | TIMESTAMPTZ NULL | NULL = sekarang |
| started_at | TIMESTAMPTZ NULL | |
| completed_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

## Tabel: `order_pricing`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| order_id | UUID (FK→orders) UNIQUE | |
| base_rate | INTEGER | Tarif dasar total |
| distance_km | DECIMAL(5,1) | Jarak terhitung |
| travel_cost | INTEGER | distance × 1000 |
| surcharge_holiday | INTEGER DEFAULT 0 | |
| surcharge_night | INTEGER DEFAULT 0 | |
| surcharge_weekend | INTEGER DEFAULT 0 | |
| surcharge_urgent | INTEGER DEFAULT 0 | |
| surcharge_floor | INTEGER DEFAULT 0 | |
| total_estimate | INTEGER | Estimasi saat booking |
| total_final | INTEGER NULL | Final setelah selesai |
| actual_duration | DECIMAL(4,1) NULL | Durasi aktual |

## Tabel: `payments`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| order_id | UUID (FK→orders) | |
| amount | INTEGER | Jumlah bayar |
| method | ENUM('qris','cash') | |
| status | ENUM('pending','paid','refunded') | |
| paid_at | TIMESTAMPTZ NULL | |
| reference | VARCHAR(100) NULL | ID transaksi gateway |

## Tabel: `reviews`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| order_id | UUID (FK→orders) UNIQUE | |
| customer_id | UUID (FK→users) | |
| worker_id | UUID (FK→users) | |
| rating | INTEGER CHECK(1-5) | Bintang 1-5 |
| comment | TEXT NULL | |
| photos | TEXT[] | Foto hasil kerja |
| created_at | TIMESTAMPTZ | |

## Tabel: `worker_wallets`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| worker_id | UUID (FK→users) UNIQUE | |
| balance | INTEGER DEFAULT 0 | Saldo (Rupiah) |
| total_earned | INTEGER DEFAULT 0 | Total pendapatan |

## Tabel: `wallet_transactions`

| Kolom | Tipe | Keterangan |
| ------- | ------ | ------------ |
| id | UUID (PK) | |
| wallet_id | UUID (FK→worker_wallets) | |
| type | ENUM('credit','debit') | |
| amount | INTEGER | |
| description | VARCHAR(200) | |
| reference_order_id | UUID NULL | |
| created_at | TIMESTAMPTZ | |

---

## Indexes

```sql
CREATE INDEX idx_workers_location ON worker_profiles USING GIST(home_location);
CREATE INDEX idx_workers_available ON worker_profiles(is_available) WHERE status = 'active';
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_worker ON orders(worker_id, status);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_worker_skills_category ON worker_skills(category_code, worker_id);
CREATE INDEX idx_addresses_user ON addresses(user_id);
```
