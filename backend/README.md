# SIRKULA-AI: Backend Service & Bio-Thermal Engine

Layanan inti backend berbasis NestJS, PostgreSQL 16 + PostGIS, Redis 7 + BullMQ, dan WebSocket Gateway untuk platform penyelamatan pangan berjenjang.

---

## 1. Tech Stack

- **Framework**: NestJS 10 (TypeScript, Fastify/Express under the hood)
- **Database**: PostgreSQL 16 dengan ekstensi PostGIS (Spasial Geodesik `GEOGRAPHY(Point, 4326)`)
- **Queue & In-Memory Cache**: Redis 7 + BullMQ (Penjadwalan Triage Degradasi Mutu Pangan)
- **Real-Time Communication**: Socket.io Gateway (Room-based namespace: role & batch)
- **AI Gateway**: Google GenAI SDK via `9router` proxy (`ag/gemini-3.8-flash-high`)
- **Security & Verifikasi**: JWT Authentication + Cryptographic HMAC-SHA256 untuk serah-terima QR

---

## 2. Struktur Monorepo Backend

```
backend/
├── apps/
│   └── backend/                   # Aplikasi NestJS utama
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/          # JWT auth & aktor terverifikasi
│       │   │   ├── batches/       # Manajemen batch pangan & query PostGIS
│       │   │   ├── claims/        # Klaim kuota, HMAC QR generation & scan
│       │   │   ├── esg-analytics/ # Perhitungan jejak karbon & metana
│       │   │   ├── simulation/    # Fast-forward waktu & uji degradasi
│       │   │   ├── triage-worker/ # BullMQ cron pengecekan window keamanan pangan
│       │   │   ├── vision-ai/     # Ingestion foto, klasifikasi risiko pangan
│       │   │   ├── weather/       # Integrasi OpenWeather API suhu sekitar
│       │   │   └── websocket/     # Socket.io gateway siaran status riil
│       │   └── main.ts            # Entrypoint & Swagger docs (/api/docs)
│       └── Dockerfile
└── packages/
    ├── bio-thermal-sdk/           # Formula Q10 Arrhenius & kalkulasi ESG
    ├── database/                  # Skema SQL, migrasi, dan seeder aktor
    └── shared-types/              # DTO, Enums, dan Contract Interfaces
```

---

## 3. Bio-Thermal Engine (Prinsip Arrhenius & Aturan Q10)

Umur simpan aman makanan dihitung secara dinamis mengikuti suhu lingkungan ambien ($T$) dari OpenWeather API:

$$t_{\text{safe}} = t_{\text{base}} \times Q_{10}^{\frac{T_{\text{ref}} - T}{10}}$$

- **$T_{\text{ref}}$**: Suhu referensi kamar ($25^\circ\text{C}$).
- **$Q_{10}$**: Koefisien laju degradasi enzimatik dan bakteri ($2.0$).
- **$t_{\text{base}}$** berdasarkan kategori risiko pangan:
  - `WET_COCONUT_MILK` (Santan/Gulai/Opor): 120 menit (2 jam)
  - `WET_NON_COCONUT` (Kuah/Sop/Capcay): 180 menit (3 jam)
  - `MOIST_PROTEIN_CARB` (Nasi, Mie, Ayam basah): 240 menit (4 jam)
  - `DRY_FRIED` (Gorengan, Rendang kering): 360 menit (6 jam)
  - `BAKERY_PASTRY` (Roti, Kue, Buah): 300 menit (5 jam)

Jika $t_{\text{safe}}$ terlewati, `triage-worker` otomatis mendowngrade batch ke `TIER_2_ANIMAL_ACTIVE`. Jika batas Tier 2 terlewati, otomatis berpindah ke `TIER_3_COMPOST_ACTIVE`.

---

## 4. Skema Database & Kueri Spasial PostGIS

1. `actors`: Identitas entitas (DONOR, TIER_1_HUB, TIER_2_FARMER, TIER_3_COMPOST, ESG_AUDITOR, SIMULATOR_ADMIN) dengan titik geodesik PostGIS.
2. `food_batches`: Data batch makanan, foto, status (`batch_state_enum`), kategori risiko, berat (kg), safe window, dan koordinat.
3. `batch_items`: Detail menu makanan dalam satu batch (nama menu, porsi, gramasi).
4. `rescue_claims`: Transaksi klaim simpul (kuota kg, token klaim, secret HMAC, status klaim).
5. `esg_telemetry_logs`: Catatan permanen $CO_2e$ avoided ($2.5\text{ kg}/\text{kg}$), $CH_4$ avoided ($0.18\text{ kg}/\text{kg}$), dan penghematan biaya pakan (Rp 8.500/kg).
6. `batch_state_audit_logs`: Audit trail historis setiap transisi status.

### Kueri Persistensi Donatur (`GET /api/v1/batches/nearby`)
Kueri radar spasial menggunakan klausul gabungan:
```sql
WHERE (
  (:actorId::text IS NOT NULL AND b.donor_id::text = :actorId::text)
  OR
  ST_DWithin(b.obfuscated_location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusM)
)
```
Hal ini memastikan Donatur selalu melihat seluruh makanan yang pernah didonasikannya secara lengkap meskipun Donatur berpindah lokasi koordinat atau melakukan logout-login.

---

## 5. Ringkasan API Endpoints

### Autentikasi
- `POST /api/v1/auth/login` : Login aktor dengan email & password
- `GET /api/v1/auth/actors` : Daftar aktor canonical terverifikasi

### Food Batches & AI
- `POST /api/v1/vision/analyze` : Ingestion & klasifikasi AI (base64/URL)
- `POST /api/v1/batches/analyze-and-create` : Publikasi batch baru oleh Donor (Vision + Weather + Bio-thermal)
- `GET /api/v1/batches/nearby` : Daftar batch aktif dengan kepemilikan donatur & filter radius PostGIS
- `GET /api/v1/batches/:id` : Detail spesifik batch beserta item

### Klaim & Handover
- `POST /api/v1/batches/:id/claim` : Klaim batch oleh Simpul / Peternak
- `POST /api/v1/batches/:id/verify-handover` : Validasi token & HMAC QR serah terima

### ESG & Simulasi
- `GET /api/v1/analytics/esg-summary` : Total jejak emisi terhindarkan dan tonase terselamatkan
- `POST /api/v1/simulation/time-warp` : Fast-forward waktu untuk demonstrasi degradasi Q10

---

## 6. WebSocket Events

| Event | Arah | Keterangan |
|---|---|---|
| `batch:created` | Server ➔ Client | Siaran batch baru ke semua simpul relevan |
| `batch:state_changed` | Server ➔ Client | Perubahan status tier batch |
| `batch:claimed` | Server ➔ Client | Notifikasi kuota batch telah terkunci |
| `batch:handover_completed`| Server ➔ Client | Konfirmasi serah-terima selesai |

---

## 7. Instruksi Pengembangan Lokal

```bash
# 1. Install seluruh workspace dependencies
pnpm install

# 2. Inisialisasi basis data dan seeding
pnpm db:reset

# 3. Jalankan server pengembangan
pnpm dev

# 4. Uji typecheck & test suite
pnpm typecheck
pnpm test
```
