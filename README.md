# SIRKULA-AI: Multi-Tier Bio-Thermal Food Rescue Ecosystem

Platform terintegrasi penyelamatan pangan berlebih berbasis Vision AI multimodal, kalkulasi pembusukan dinamis (Arrhenius/Q10), PostGIS spatial dispatching, sinkronisasi real-time WebSocket, dan verifikasi serah-terima kriptografis HMAC QR.

---

## 1. Quick Start Guide

### Prasyarat
- Docker & Docker Compose v2+
- Node.js 20+ & pnpm (`npm i -g pnpm`)
- Expo Go di smartphone (untuk mobile) atau emulator Android/iOS

### Jalankan Semua Layanan (1 Perintah)
```bash
# 1. Clone & masuk ke direktori
cd HIMTEC

# 2. Jalankan PostgreSQL, Redis, Backend NestJS, dan Web Frontend via Docker
docker compose up -d --build

# 3. Verifikasi status container
docker compose ps
```

Container aktif:
- `sirkula-postgres` : `localhost:5432` (PostgreSQL 16 + PostGIS 3.4)
- `sirkula-redis`    : `localhost:6379` (Redis 7 AOF)
- `sirkula-backend`  : `http://localhost:4000` (Swagger: `http://localhost:4000/api/docs`)
- `sirkula-frontend` : `http://localhost:3000` (Web UI)

### Database Seeding & Reset
Jika perlu inisialisasi ulang 13 data aktor canonical Bandung dan reset batch:
```bash
cd backend
pnpm db:reset
```

### Menjalankan Mobile App (Expo)
```bash
cd mobile

# 1. Install dependensi
pnpm install

# 2. Jalankan Metro bundler
npx expo start -c
```
- Buka Expo Go di smartphone dan scan QR code pada terminal.
- *Catatan HP fisik*: Pastikan `EXPO_PUBLIC_API_URL` di `mobile/.env` diarahkan ke IP LAN PC Anda (contoh: `http://192.168.1.10:4000`).

---

## 2. Kredensial Aktor Canonical (Semua Password: `password123`)

| Peran (Role) | Entitas / Nama | Email Akun | Radius / Wilayah |
|---|---|---|---|
| **DONOR** | Sabuga ITB Convention Hall | `catering@sabuga.itb.ac.id` | Coblong, Bandung |
| **DONOR** | Hotel Savoy Homann | `fnb@savoyhomann.com` | Asia Afrika, Bandung |
| **DONOR** | Warteg Bahari Dago | `warteg.dago@gmail.com` | Dago, Bandung |
| **TIER_1_HUB** | DKM Masjid Al-Ukhuwah | `marbot@alukhuwah-bandung.org` | Wastukencana (Balai Kota) |
| **TIER_1_HUB** | Panti Asuhan Al-Fien | `pengurus@pantialfien.org` | Cisitu Indah, Dago |
| **TIER_1_HUB** | Dapur Warga Tamansari | `dapur.tamansari@gmail.com` | Tamansari Bawah |
| **TIER_1_HUB** | Posko Pangan Sukajadi | `posko.sukajadi@gmail.com` | Sukajadi, Bandung |
| **TIER_2_FARMER** | Bio-Larva Maggot BSF | `maggot.cibiru@gmail.com` | Cibiru (500 kg/hari) |
| **TIER_2_FARMER** | Kolam Lele Sangkuriang | `lele.kopo@gmail.com` | Kopo (300 kg/hari) |
| **TIER_2_FARMER** | Peternakan Unggas Rakyat | `unggas.baleendah@gmail.com` | Baleendah (400 kg/hari) |
| **TIER_3_COMPOST** | Bank Sampah Induk Babakan Siliwangi | `banksampah.baksil@bandung.go.id` | Baksil (1000 kg/hari) |
| **ESG_AUDITOR** | Auditor DLH Kota Bandung | `auditor@dlh.bandung.go.id` | DLH Gedung B |
| **SIMULATOR_ADMIN** | Dewan Juri HIMTEC Admin | `admin@sirkula.ai` | Command Center ITB |

*Semua akun menggunakan password:* `password123` *(atau string password valid >= 6 karakter).*

---

## 3. Arsitektur & Alur Kerja Sistem

```
[DONOR: Foto Makanan]
         │
         ▼
[Vision AI Ingestion (9router/Gemini)] ──► Deteksi Kategori, Porsi, Suhu Awal, & t_base
         │
         ▼
[Dynamic Bio-Thermal Engine (Q10)] ◄── Data Suhu Riil (OpenWeather API)
         │
   Window Safe T1 (Konsumsi Manusia)
         │
    ┌────┴───────────────────────────┐
    │                                │
[Masih Aman: T1]            [Lewat Batas T1: T2]
    │                                │
[Simpul Komunitas/Panti]    [Peternak Maggot/Lele]
    │                                │
    └───────────────┬────────────────┘
                    │ [Lewat Batas T2: T3]
                    ▼
          [Bank Sampah / Kompos]
                    │
                    ▼
     [Klaim & QR Handover Terenkripsi HMAC]
                    │
                    ▼
     [ESG Carbon & Methane Avoided Ledger]
```

### Siklus Status Pangan:
1. `TIER_1_HUMAN_ACTIVE`: Siap diklaim simpul manusia (DKM/Panti).
2. `TIER_1_CLAIMED`: Terkunci transaksi simpul 1; menunggu kurir & scan QR.
3. `TIER_2_ANIMAL_ACTIVE`: Otomatis diturunkan triage worker jika safe window manusia kedaluwarsa.
4. `TIER_2_CLAIMED`: Diklaim peternak maggot/lele.
5. `TIER_3_COMPOST_ACTIVE`: Diturunkan untuk komposting anaerobik terkontrol.
6. `COMPLETED`: Serah terima tuntas, ledger ESG tercatat permanen.

---

## 4. Persistensi Data Donatur & Sinkronisasi Pasca-Logout

Sistem menjamin data donasi yang telah dibuat oleh Donatur tidak akan hilang saat logout dan login kembali:
- **Kueri Kepemilikan Eksplisit PostGIS**: Pada `BatchesService.getNearbyBatches`, kueri database menggabungkan klausa `(b.donor_id = :donorId OR ST_DWithin(...))`. Seluruh batch yang dibuat oleh donatur terkait selalu ditarik kembali ke dashboard donor, tanpa tereliminasi oleh filter jarak spasial radar.
- **Normalisasi ID Server-Client**: Respons ingesti backend (`batch_id`) langsung dipetakan ke ID riil batch di database PostgreSQL, mencegah inkonsistensi ID sintesis lokal.
- **Penggabungan State Aman (Safe Merge)**: Klien web dan mobile menggabungkan batch lokal dengan data sinkronisasi backend, mencegah penimpaan data saat sesi berpindah.

---

## 5. Struktur Repositori

```
HIMTEC/
├── docker-compose.yml          # Orkestrasi Docker (Postgres, Redis, Backend, Web)
├── README.md                   # Dokumentasi Utama & Quick Start
├── backend/                    # NestJS Monorepo (Turbo + pnpm)
│   ├── apps/backend/           # API Core, WebSocket, BullMQ Workers, AI Vision
│   ├── packages/
│   │   ├── bio-thermal-sdk/    # Kalkulasi Q10 Arrhenius & Konversi ESG
│   │   └── database/           # Migrasi SQL PostGIS & Skrip Seeder
│   └── README.md               # Dokumentasi Backend
├── mobile/                     # Expo React Native App (Android/iOS)
│   ├── src/app/                # File-based routing untuk tiap Role
│   ├── src/components/         # UI Header, Radar, Bottom Tabs
│   ├── src/hooks/              # useSocketSync, useAuthStore
│   └── README.md               # Dokumentasi Mobile
└── web/                        # Web Dashboard Vanilla ES Modules
    ├── src/                    # Views, Store, API client, Socket sync
    ├── server.cjs              # HTTP Server statis Node.js
    └── README.md               # Dokumentasi Web
```

---

## 6. Sinkronisasi Data & WebSocket Terpadu

Web dan Mobile terhubung ke Backend dan Database yang identik:
- Event `batch:created`: Notifikasi instan saat donor mempublikasikan batch makanan baru.
- Event `batch:state_changed`: Transisi status batch otomatis (Q10 timeout / degradasi tier).
- Event `batch:claimed`: Sinkronisasi klaim simpul secara real-time.
- Event `batch:handover_completed`: Konfirmasi serah terima via QR code.
