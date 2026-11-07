# AGENTS.md (CLAUDE.md / .cursorrules)

## 1. Project Context Summary

**SIRKULA-AI** adalah platform penyelamatan pangan *real-time* yang menggabungkan *Zero-Click Vision AI Ingestion*, kalkulasi pembusukan mikrobiologi *Bio-Thermal* ($Q_{10}$), *Automated 3-Tier Triage* (Manusia $\rightarrow$ Pakan Ternak/Maggot $\rightarrow$ Kompos), dan distribusi anonim berbasis *Cryptographic Blind Handshake*. Proyek ini menggunakan arsitektur Monorepo (**Turborepo + pnpm**) dengan **NestJS (TypeScript)** sebagai *Unified Backend*, **Next.js 15 (App Router, Tailwind CSS, Mapbox GL JS)** untuk *Web Command Center*, serta **React Native (Expo SDK 52, Expo Router, NativeWind, Zustand)** untuk *Mobile Field App*. Lapisan persistensi dan *state machine* ditenagai oleh **PostgreSQL 16 + PostGIS**, **Redis 7 + BullMQ**, serta integrasi eksternal ke **Google Gemini 2.5 Flash API** dan **OpenWeatherMap API**.

---

## 2. Coding Conventions

* **TypeScript Strictness:** Wajib menggunakan `strict: true`. Penggunaan `any`, `@ts-ignore`, atau *non-null assertion* (`!`) tanpa pengaman dilarang keras; gunakan `unknown` dengan *type narrowing* atau skema **Zod**.
* **Aturan Penamaan (Naming Conventions):**
* **Variabel, Fungsi, & Method:** `camelCase` (contoh: `calculateDynamicSafeWindow`, `verifyQrHandshake`).
* **Class, Interface, Type, Enum, & Komponen React:** `PascalCase` (contoh: `FoodBatchController`, `VisionAnalysisResponse`).
* **Konstanta Global & Environment Variables:** `UPPER_SNAKE_CASE` (contoh: `Q10_TEMPERATURE_COEFFICIENT`, `SAFETY_BUFFER_MINUTES`).
* **Kolom Database & Payload JSON (REST/WebSocket):** `snake_case` secara konsisten sesuai kontrak `PRD.md` dan `schema.sql` (contoh: `tier1_expires_at`, `highest_risk_category`, `obfuscated_location`).
* **Nama File & Direktori:** `kebab-case` untuk seluruh file modul dan utilitas (contoh: `q10-calculator.ts`, `triage-worker.service.ts`).


* **Gaya Penulisan Fungsi:**
* Gunakan *pure functions* untuk seluruh kalkulasi matematis (Bio-Thermal $Q_{10}$ dan konversi karbon ESG).
* Terapkan *early return* (*guard clauses*) untuk menghindari *nested `if-else*` lebih dari 2 tingkat.
* Gunakan `async/await` secara eksklusif; dilarang mencampur rantai `.then().catch()` mentah.


* **Sentralisasi Tipe Data:** Seluruh DTO, skema validasi Zod, enum (`BatchState`, `ActorRole`, `FoodRiskCategory`), dan kontrak *event* Socket.io wajib didefinisikan di `@sirkula/shared-types` dan diimpor oleh `backend`, `web`, serta `mobile`.

---

## 3. Architecture & Pattern Rules

* **Single Source of Truth untuk Rumus Bisnis:** Dilarang menduplikasi rumus pembusukan $Q_{10}$ atau kalkulasi emisi $CO_2e$/$CH_4$ di dalam folder `apps/`. Seluruh kalkulasi wajib dipanggil dari paket `@sirkula/bio-thermal-sdk`.
* **Pemisahan Layer Backend (NestJS):**
* **Controllers (`*.controller.ts`):** Hanya menangani *routing* HTTP, ekstraksi parameter, dan validasi input Zod. Dilarang menulis logika bisnis atau kueri SQL di dalam Controller.
* **Services (`*.service.ts`):** Menangani logika bisnis, orkestrasi transaksi database, serta pemanggilan antrean BullMQ.
* **Gateways (`*.gateway.ts`):** Hanya bertugas melakukan *broadcast event* WebSocket ke *room* yang relevan tanpa memproses mutasi database.


* **Otoritas State Machine:** Transisi status `current_state` (`TIER_1_HUMAN_ACTIVE` $\rightarrow$ `TIER_2_ANIMAL_ACTIVE` $\rightarrow$ `TIER_3_COMPOST_ACTIVE`) dikendalikan mutlak oleh Backend dan *worker* BullMQ. Klien (`web` dan `mobile`) dilarang memutasi *tier* secara lokal dan hanya boleh merender ulang UI berdasarkan *timestamp* server atau *event* WebSocket `batch:state_transitioned`.
* **Akses Database & Kueri Spasial:**
* Seluruh pencarian radius wajib dieksekusi di level database menggunakan fungsi PostGIS `ST_DWithin` dan `ST_Distance` dengan tipe `GEOGRAPHY(Point, 4326)` agar memanfaatkan indeks `GIST`.
* Dilarang menarik seluruh baris tabel ke memori Node.js untuk difilter menggunakan rumus Haversine manual.


* **Sinkronisasi State Klien (Web & Mobile):** Gunakan **TanStack Query** untuk *initial fetch* dan **Socket.io client listener** untuk memutasi cache secara langsung (`queryClient.setQueryData`) saat menerima event *real-time*. Gunakan **Zustand** (dengan `AsyncStorage` *persistence* di Mobile) khusus untuk state sesi peran aktif (`activeRole`) dan antrean transaksi *offline*.
* **Environment Variables:** Dilarang memanggil `process.env.VAR_NAME` secara langsung di dalam komponen atau *service*. Gunakan modul konfigurasi tervalidasi Zod (`src/config/env.ts`) yang gagal cepat (*fail-fast*) saat *booting* jika variabel wajib tidak ditemukan.

---

## 4. Error Handling & Security

* **Validasi Input Ketat:** Semua input `multipart/form-data`, `req.body`, `req.query`, dan *payload* WebSocket wajib melewati *pipe* validasi Zod sebelum menyentuh *service layer*. Kembalikan `HTTP 400 Bad Request` dengan rincian field yang gagal.
* **Ketahanan API Eksternal (Fallback Deterministik):**
* Panggil Gemini 2.5 Flash API dan OpenWeatherMap API secara paralel menggunakan `Promise.allSettled()`.
* Pasang batas *timeout* ketat $1.000\text{ ms}$ pada OpenWeatherMap API. Jika gagal atau *timeout*, sistem wajib beralih otomatis ke konstanta *fallback* iklim tropis: `ambient_temp_c = 30.0`, `humidity_pct = 75`.
* Jika Gemini Vision gagal mengembalikan JSON valid, gunakan *fallback* aman: `category = 'MOIST_PROTEIN_CARB'`, `base_shelf_life_min = 120`, `total_weight_kg = 5.0`.


* **Pencegahan Race Condition (Atomic Locking):**
* Setiap request ke `POST /api/v1/batches/:id/claim` wajib mengakuisisi kunci Redis terlebih dahulu: `SET lock:batch:<batch_id> <actor_id> NX EX 10`.
* Jika gagal mengakuisisi kunci, segera lempar `HTTP 409 Conflict` tanpa mengeksekusi transaksi PostgreSQL.


* **Keamanan Privasi Lokasi & Kriptografi Handshake:**
* Endpoint daftar *batch* publik (`GET /batches/nearby`) **wajib** hanya mengembalikan `obfuscated_location` dan menyembunyikan `exact_pickup_location` serta `handover_point_notes` hingga *batch* berstatus `TIER_1_CLAIMED` atau `TIER_2_CLAIMED` oleh pemohon yang sah.
* Token QR serah terima wajib ditandatangani dengan `HMAC-SHA256` (memuat `batch_id`, `receiver_id`, `expires_at`) agar dapat diverifikasi secara *offline* oleh aplikasi Mobile Donatur di area *basement* tanpa sinyal.
* **Safety Invariant Mutlak:** Saat memproses `/verify-handover` untuk klaim `TIER_1_HUMAN`, jika `NOW() >= tier1_expires_at`, backend wajib menolak verifikasi (`HTTP 422 Unprocessable Entity`), mencabut klaim kurir manusia, dan memaksa mutasi ke `TIER_2_ANIMAL_ACTIVE`.



---

## 5. Strict Do's and Don'ts

### DO's (Wajib Dilakukan)

* **Tulis Implementasi Utuh:** Selalu tulis logika fungsi, *query SQL*, dan penanganan *error* secara lengkap dan siap jalan (*production/demo-ready*).
* **Pertahankan Kontrak Gemini JSON:** Gunakan parameter `responseSchema` dan `responseMimeType: "application/json"` pada SDK `@google/genai` agar output Gemini 2.5 Flash selalu sesuai dengan interface `VisionAnalysisResponse`.
* **Catat Audit Log:** Setiap perubahan `current_state` pada tabel `food_batches` (baik karena BullMQ timer, klaim user, maupun intervensi *God-Mode Simulator*) wajib menyisipkan baris baru ke tabel `batch_state_audit_logs` dalam transaksi database yang sama.
* **Gunakan Generated Columns DB:** Biarkan PostgreSQL menghitung `co2e_avoided_kg`, `methane_ch4_avoided_kg`, dan `estimated_feed_savings_idr` secara otomatis pada tabel `esg_telemetry_logs` sesuai definisi `schema.sql`.

### DON'Ts (Larangan Keras)

* **JANGAN** menulis komentar *placeholder* seperti `// TODO: implement logic here`, `// ... rest of the code`, atau meninggalkan fungsi kosong.
* **JANGAN** mengubah struktur tabel, nama kolom, tipe `ENUM`, atau *constraint* di dalam `packages/database/migrations/001_initial_schema.sql` tanpa instruksi eksplisit dari pengguna.
* **JANGAN** menginstal *library* pihak ketiga baru (seperti `moment`, `lodash`, `axios`) jika fungsi bawaan Node.js/Browser (`fetch`, `Intl.DateTimeFormat`, `crypto.createHmac`) atau paket yang sudah ada di `package.json` dapat menyelesaikannya.
* **JANGAN** menggunakan *HTTP Polling* (`setInterval` + `fetch`) di Web maupun Mobile untuk memperbarui hitung mundur atau status peta; gunakan *event* WebSocket secara eksklusif.
* **JANGAN** menghapus komentar dokumentasi penting pada skema SQL, rumus algoritma $Q_{10}$, atau blok penjelasan *Digital Liability Waiver*.

---

## 6. Common Commands

Jalankan perintah berikut dari *root directory* monorepo (`sirkula-ai/`):

```bash
# 1. Instalasi & Persiapan Infrastruktur Lokal
pnpm install                                      # Instal seluruh dependensi workspace
docker compose up -d                              # Jalankan container PostgreSQL 16 (PostGIS) & Redis 7

# 2. Database Migration & Seeding
pnpm --filter @sirkula/database db:migrate        # Eksekusi DDL 001_initial_schema.sql ke PostGIS
pnpm --filter @sirkula/database db:seed           # Isi data dummy koordinat Bandung/Jakarta (Donatur, Masjid, Peternak Maggot)
pnpm --filter @sirkula/database db:reset          # Drop, buat ulang skema, dan jalankan ulang seeder

# 3. Menjalankan Server Development
pnpm dev                                          # Jalankan Backend, Web, dan Mobile secara paralel via Turborepo
pnpm --filter @sirkula/backend dev                # Jalankan NestJS API & BullMQ Worker (Port 4000)
pnpm --filter @sirkula/web dev                    # Jalankan Next.js 15 Command Center (Port 3000)
pnpm --filter @sirkula/mobile start               # Jalankan Expo Metro Bundler untuk aplikasi Mobile

# 4. Build, Typecheck, & Linting
pnpm build                                        # Build seluruh paket (shared-types, bio-thermal-sdk, apps)
pnpm typecheck                                    # Jalankan tsc --noEmit di seluruh workspace
pnpm lint                                         # Jalankan ESLint & pengecekan aturan kode
pnpm test                                         # Jalankan unit test (terutama pengujian rumus Q10 di bio-thermal-sdk)

```