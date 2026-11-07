# PLAN.md — Roadmap Implementasi SIRKULA-AI

Dokumen ini adalah rencana eksekusi teknis (*implementation roadmap*) bertahap untuk membangun ekosistem **SIRKULA-AI** (Monorepo: NestJS Backend, Next.js 15 Web Command Center, dan React Native Expo Mobile App). Setiap tugas dirancang secara atomik dan dapat diverifikasi langsung dalam satu sesi koding.

---

## Fase 1: Setup Monorepo, Infrastruktur Lokal & Shared Packages

Fase ini membangun fondasi Turborepo, menjalankan container database spasial & in-memory queue, serta mengunci kontrak tipe data dan rumus matematika di level paket bersama (*shared packages*).

* [ ] **1.1 Inisialisasi Workspace Turborepo & Konfigurasi TypeScript Ketat**
* **File:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`
* **Detail:** Konfigurasi workspace untuk `apps/*` dan `packages/*`. Aktifkan `"strict": true`, `"noImplicitAny": true`, dan *path aliases* `@sirkula/*`.
* **Verifikasi:** Jalankan `pnpm install` dan pastikan struktur workspace dikenali tanpa error.


* [ ] **1.2 Setup Container PostgreSQL 16 (PostGIS) & Redis 7**
* **File:** `docker-compose.yml`, `.env.example`
* **Detail:** Buat definisi service `postgres` menggunakan image `postgis/postgis:16-3.4-alpine` (port `5432`) dan `redis` menggunakan `redis:7-alpine` (port `6379`) beserta *healthcheck* dan *named volumes*.
* **Verifikasi:** Jalankan `docker compose up -d` dan pastikan kedua container berstatus `healthy`.


* [ ] **1.3 Implementasi Paket `@sirkula/shared-types` (Enums, DTOs, & WebSocket Contracts)**
* **File:** `packages/shared-types/package.json`, `packages/shared-types/src/enums.ts`, `packages/shared-types/src/dtoSchemas.ts`, `packages/shared-types/src/websocketEvents.ts`, `packages/shared-types/src/index.ts`
* **Detail:** Definisikan enum (`ActorRole`, `FoodRiskCategory`, `BatchState`, `ClaimStatus`, `StateTriggerSource`), skema validasi Zod untuk REST request/response (`snake_case`), serta interface event Socket.io (`batch:created`, `batch:state_transitioned`, `batch:claimed`, `batch:handover_completed`).
* **Verifikasi:** Jalankan `pnpm --filter @sirkula/shared-types typecheck` tanpa error kompilasi.


* [ ] **1.4 Implementasi Paket `@sirkula/bio-thermal-sdk` (Rumus Mikrobiologi $Q_{10}$ & Konversi ESG)**
* **File:** `packages/bio-thermal-sdk/package.json`, `packages/bio-thermal-sdk/src/q10-calculator.ts`, `packages/bio-thermal-sdk/src/esg-converter.ts`, `packages/bio-thermal-sdk/src/q10-calculator.spec.ts`, `packages/bio-thermal-sdk/src/index.ts`
* **Detail:** Tulis *pure function* `calculateDynamicSafeWindow()` menggunakan konstanta $Q_{10} = 2.2$, $T_{\text{ref}} = 25.0^\circ\text{C}$, penalti kelembapan $\alpha = 0.15$ jika $RH > 70\%$, dan buffer perjalanan $20\text{ menit}$. Tambahkan fungsi konversi emisi karbon ($2.5\text{ kg } CO_2e/\text{kg}$) dan nilai pakan maggot ($\text{Rp } 3.800/\text{kg}$).
* **Verifikasi:** Jalankan unit test `pnpm --filter @sirkula/bio-thermal-sdk test` untuk skenario suhu sejuk ($22^\circ\text{C}$) vs panas ekstrem ($35^\circ\text{C}$).



---

## Fase 2: Database Spasial, Seeding & Konteks Otentikasi

Fase ini menerapkan skema DDL PostGIS, mengisi data geospasial awal untuk kebutuhan demo, serta menyiapkan infrastruktur koneksi database dan manajemen peran pengguna.

* [ ] **2.1 Runner Migrasi Skema SQL & Ekstensi PostGIS**
* **File:** `packages/database/package.json`, `packages/database/migrations/001_initial_schema.sql`, `packages/database/src/migrate.ts`
* **Detail:** Salin DDL lengkap dari `schema.sql` (tabel `actors`, `food_batches`, `batch_items`, `rescue_claims`, `esg_telemetry_logs`, `batch_state_audit_logs`, indeks `GIST`, dan trigger `updated_at`) beserta skrip eksekutor migrasinya.
* **Verifikasi:** Jalankan `pnpm --filter @sirkula/database db:migrate` dan periksa pembentukan 6 tabel serta indeks spasial di PostgreSQL.


* [ ] **2.2 Seeder Data Geospasial Realistis (Koordinat Bandung/Jakarta)**
* **File:** `packages/database/src/seed.ts`
* **Detail:** Buat skrip *seeding* yang menyisipkan aktor terverifikasi dengan titik koordinat `GEOGRAPHY(Point, 4326)` nyata: 3 `DONOR` (Gedung Pernikahan, Hotel, Warteg), 4 `TIER_1_HUB` (Masjid/RT dalam radius $800\text{m}\text{--}2.500\text{m}$), 3 `TIER_2_FARMER` (Peternak Maggot BSF/Lele dalam radius $4\text{km}\text{--}8\text{km}$), dan 1 `TIER_3_COMPOST`.
* **Verifikasi:** Jalankan `pnpm --filter @sirkula/database db:seed` dan uji kueri `ST_Distance` antar aktor di database.


* [ ] **2.3 Bootstrap NestJS Backend, Validasi Env & Koneksi Pool Database/Redis**
* **File:** `apps/backend/package.json`, `apps/backend/src/config/env.ts`, `apps/backend/src/database/database.module.ts`, `apps/backend/src/main.ts`
* **Detail:** Setup aplikasi NestJS di port `4000`, validasi environment variables (`DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, `HMAC_SECRET_KEY`) menggunakan Zod *fail-fast*, dan daftarkan provider koneksi PostgreSQL (`pg`) serta Redis (`ioredis`).
* **Verifikasi:** Jalankan `pnpm --filter @sirkula/backend dev` dan pastikan server menyala tanpa error koneksi.


* [ ] **2.4 Modul Auth & Dynamic Role Context Guard**
* **File:** `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/auth.service.ts`, `apps/backend/src/common/guards/actor-role.guard.ts`
* **Detail:** Buat endpoint `GET /api/v1/auth/actors` (mengambil daftar profil aktor hasil *seed* untuk fitur *1-Tap Role Switcher* saat demo) dan `Guard` pembaca header `x-actor-id` serta `x-actor-role` untuk memvalidasi otorisasi endpoint.
* **Verifikasi:** Panggil `GET /api/v1/auth/actors` dan pastikan daftar aktor kembali lengkap dengan koordinat dan perannya.



---

## Fase 3: Core Backend, AI Ingestion, Bio-Thermal Worker & WebSocket

Fase ini membangun jantung kecerdasan dan *state machine* **SIRKULA-AI**, mulai dari integrasi paralel Gemini Vision + Weather API hingga automasi mutasi *tier* menggunakan BullMQ.

* [ ] **3.1 Modul Weather Service dengan Timeout 1000ms & Fallback Tropis**
* **File:** `apps/backend/src/modules/weather/weather.service.ts`, `apps/backend/src/modules/weather/weather.module.ts`
* **Detail:** Implementasikan klien HTTP ke OpenWeatherMap API (`GET /data/2.5/weather`) menggunakan `AbortSignal.timeout(1000)`. Jika gagal atau *timeout*, kembalikan nilai *fallback* deterministik: `{ ambient_temp_c: 30.0, humidity_pct: 75, is_fallback: true }`.
* **Verifikasi:** Uji pemanggilan fungsi dengan API key valid dan simulasi *timeout* untuk memastikan *fallback* bekerja tanpa melempar *unhandled exception*.


* [ ] **3.2 Modul Vision AI Service (Gemini 2.5 Flash Structured JSON)**
* **File:** `apps/backend/src/modules/vision-ai/vision-ai.service.ts`, `apps/backend/src/modules/vision-ai/vision-ai.module.ts`
* **Detail:** Integrasikan SDK `@google/genai` menggunakan model `gemini-2.5-flash` dengan `responseMimeType: "application/json"` dan `responseSchema` ketat untuk mengekstrak nama menu, porsi, berat (kg), kategori risiko mikrobiologi, dan kelayakan pakan ternak. Pasang *fallback* aman (`MOIST_PROTEIN_CARB`, $t_{\text{base}} = 120\text{ menit}$, berat $5\text{ kg}$) jika parsing gagal.
* **Verifikasi:** Kirim 1 sampel gambar makanan prasmanan dan pastikan respons JSON sesuai skema `VisionAnalysisResponse` dalam $< 2.5\text{ detik}$.


* [ ] **3.3 Modul WebSocket Gateway (Socket.io Pub/Sub Broadcaster)**
* **File:** `apps/backend/src/modules/websocket/websocket.gateway.ts`, `apps/backend/src/modules/websocket/websocket.module.ts`
* **Detail:** Buat Socket.io server dengan dukungan *rooms* berdasarkan role (`room:TIER_1_HUB`, `room:TIER_2_FARMER`, `room:COMMAND_CENTER`) serta method helper untuk memancarkan event `batch:created`, `batch:state_transitioned`, `batch:claimed`, dan `batch:handover_completed`.
* **Verifikasi:** Hubungkan klien WebSocket uji coba dan pastikan pesan broadcast diterima di *room* yang sesuai.


* [ ] **3.4 Endpoint Ingesti Utama (`POST /api/v1/batches/analyze-and-create`)**
* **File:** `apps/backend/src/modules/batches/batches.controller.ts`, `apps/backend/src/modules/batches/batches.service.ts`, `apps/backend/src/modules/batches/utils/geo-jitter.ts`
* **Detail:** Terima unggahan gambar multipart, koordinat `latitude`/`longitude`, `exposed_minutes`, dan `is_ac_room`. Jalankan `VisionAiService` dan `WeatherService` secara paralel via `Promise.allSettled()`, hitung `tier1_expires_at` dan `tier2_expires_at` memakai `@sirkula/bio-thermal-sdk`, buat koordinat `obfuscated_location` (geser acak $200\text{--}300\text{m}$), simpan ke `food_batches`, `batch_items`, dan `batch_state_audit_logs` dalam 1 transaksi SQL, lalu pancarkan event `batch:created`.
* **Verifikasi:** Kirim request `POST` dengan foto makanan; pastikan status `201 Created` kembali beserta perhitungan waktu aman yang akurat.


* [ ] **3.5 Endpoint Radar Geospasial PostGIS (`GET /api/v1/batches/nearby`)**
* **File:** `apps/backend/src/modules/batches/batches.controller.ts`, `apps/backend/src/modules/batches/batches.service.ts`
* **Detail:** Implementasikan kueri `ST_DWithin` dan `ST_Distance` berdasarkan `lat`, `lng`, `radius_m`, dan peran pemohon. Jika `TIER_1_HUB`, hanya kembalikan batch `TIER_1_HUMAN_ACTIVE`. Jika `TIER_2_FARMER`, hanya kembalikan `TIER_2_ANIMAL_ACTIVE`. Sembunyikan `exact_pickup_location` dan `handover_point_notes` pada endpoint ini.
* **Verifikasi:** Uji request menggunakan koordinat Masjid hasil *seeding* dan pastikan jarak dalam satuan meter terurut dari yang terdekat.


* [ ] **3.6 BullMQ Triage Worker (Auto-Mutasi Tier 1 $\rightarrow$ Tier 2 $\rightarrow$ Tier 3 & Ripple Radius)**
* **File:** `apps/backend/src/modules/triage-worker/triage-worker.processor.ts`, `apps/backend/src/modules/triage-worker/triage-worker.service.ts`, `apps/backend/src/modules/triage-worker/triage-worker.module.ts`
* **Detail:** Buat processor BullMQ untuk 3 jenis *delayed job*:
1. `expand-ripple`: Perluas `current_ripple_radius_m` ($1.500\text{m} \rightarrow 3.000\text{m} \rightarrow 5.000\text{m}$) jika belum diklaim setelah 10 menit.
2. `mutate-to-tier2`: Saat `tier1_expires_at` tercapai dan status belum `COMPLETED`, ubah status `food_batches` menjadi `TIER_2_ANIMAL_ACTIVE`, batalkan klaim Tier 1 yang terlambat (`EXPIRED_AUTO_REVOKED`), catat ke `batch_state_audit_logs`, dan pancarkan `batch:state_transitioned`.
3. `mutate-to-tier3`: Saat `tier2_expires_at` tercapai, ubah status menjadi `TIER_3_COMPOST_ACTIVE`.


* **Verifikasi:** Buat batch dengan TTL singkat (10 detik) dan amati perpindahan status otomatis di database serta pancaran WebSocket-nya.


* [ ] **3.7 Endpoint Klaim Atomic Lock & Generator Token QR HMAC (`POST /api/v1/batches/:id/claim`)**
* **File:** `apps/backend/src/modules/claims/claims.controller.ts`, `apps/backend/src/modules/claims/claims.service.ts`, `apps/backend/src/modules/claims/crypto-qr.service.ts`
* **Detail:** Akuisisi kunci Redis `SET lock:batch:<id> <actor_id> NX EX 10` (lempar `409 Conflict` jika gagal). Ubah state batch menjadi `TIER_1_CLAIMED` atau `TIER_2_CLAIMED`, buat baris di `rescue_claims`, dan hasilkan payload QR bertanda tangan `HMAC-SHA256` (`batch_id`, `claim_id`, `receiver_id`, `tier`, `exp`). Buka informasi `exact_pickup_location` dan `handover_point_notes` pada respons klaim ini.
* **Verifikasi:** Kirim 2 request klaim serentak; pastikan tepat 1 request berhasil (`200 OK`) dan 1 request ditolak (`409 Conflict`).


* [ ] **3.8 Endpoint Verifikasi Handover QR, Safety Invariant & ESG Telemetry (`POST /api/v1/batches/:id/verify-handover`)**
* **File:** `apps/backend/src/modules/claims/claims.controller.ts`, `apps/backend/src/modules/claims/claims.service.ts`
* **Detail:** Validasi tanda tangan HMAC QR token. **Safety Invariant:** Jika klaim adalah `TIER_1_HUMAN` tetapi waktu server `NOW() >= tier1_expires_at`, tolak dengan `422 Unprocessable Entity` dan paksa mutasi ke `TIER_2_ANIMAL_ACTIVE`. Jika valid, batalkan *delayed job* di BullMQ, ubah status menjadi `COMPLETED`, hasilkan `waiver_signature_hash` (SHA-256), sisipkan baris ke `esg_telemetry_logs`, dan pancarkan `batch:handover_completed`.
* **Verifikasi:** Uji scan QR tepat waktu (sukses menghasilkan sertifikat waiver & log karbon ESG) vs scan QR kedaluwarsa (ditolak otomatis oleh sistem).


* [ ] **3.9 Endpoint Analitik ESG & God-Mode Simulator (`GET /api/v1/analytics/esg-summary` & `POST /api/v1/simulation/time-warp`)**
* **File:** `apps/backend/src/modules/esg-analytics/esg-analytics.controller.ts`, `apps/backend/src/modules/simulation/simulation.controller.ts`, `apps/backend/src/modules/simulation/simulation.service.ts`
* **Detail:**
1. `GET /analytics/esg-summary`: Agregasi total berat (kg), porsi manusia, pakan maggot, total `co2e_avoided_kg`, `methane_ch4_avoided_kg`, serta daftar *Digital Liability Waiver* terbaru.
2. `POST /simulation/time-warp`: Terima input `batch_id`, `override_temp_c`, atau `force_expire_tier1: true`. Hitung ulang $Q_{10}$ atau langsung panggil fungsi mutasi `mutate-to-tier2` secara instan dengan sumber audit `GOD_MODE_SIMULATOR`.


* **Verifikasi:** Panggil endpoint `time-warp` pada batch aktif dan pastikan transisi Tier 1 $\rightarrow$ Tier 2 terjadi dalam $< 100\text{ ms}$.



---

## Fase 4: Aplikasi Mobile Lapangan (React Native Expo)

Fase ini membangun antarmuka bergerak (*Zero-UI*) untuk Donatur, Simpul Komunitas (Tier 1), dan Peternak Maggot/Lele (Tier 2) dalam satu aplikasi dengan fitur *Dynamic Role Switcher*.

* [ ] **4.1 Setup Expo Router, NativeWind, Zustand Store & Role Switcher Header**
* **File:** `apps/mobile/package.json`, `apps/mobile/src/store/useActorStore.ts`, `apps/mobile/src/hooks/useSocketSync.ts`, `apps/mobile/src/app/_layout.tsx`
* **Detail:** Konfigurasi navigasi berbasis grup peran (`(donor)`, `(tier1-hub)`, `(tier2-farmer)`), *header bar* untuk berganti akun aktor (`DONOR` / `TIER_1_HUB` / `TIER_2_FARMER`) secara instan saat demo, dan koneksi Socket.io global yang memutasi cache TanStack Query.
* **Verifikasi:** Buka aplikasi di Expo Go / Emulator dan uji pergantian peran yang langsung mengubah warna tema dan rute layar.


* [ ] **4.2 Layar Donatur: Zero-UI AI Camera & Slider Jam Matang**
* **File:** `apps/mobile/src/app/(donor)/index.tsx`, `apps/mobile/src/components/donor/ExposureSlider.tsx`, `apps/mobile/src/components/donor/BatchPreviewModal.tsx`
* **Detail:** Integrasikan `expo-camera` dengan kompresi gambar otomatis, 1 *slider* sentuh (`Baru Matang (0m)`, `2 Jam Lalu (120m)`, `4 Jam Lalu (240m)`), dan toggle `Ruangan Ber-AC`. Tampilkan modal hasil deteksi Gemini Vision + *Countdown Timer* Bio-Thermal sebelum rilis.
* **Verifikasi:** Foto makanan menggunakan HP, pastikan pratinjau AI muncul dalam $< 3\text{ detik}$, dan rilis batch ke server.


* [ ] **4.3 Layar Simpul Warga (Tier 1): Radar Martabat & Tiket QR Dinamis**
* **File:** `apps/mobile/src/app/(tier1-hub)/index.tsx`, `apps/mobile/src/app/(tier1-hub)/mission/[id].tsx`, `apps/mobile/src/components/shared/DynamicQrTicket.tsx`
* **Detail:** Tampilkan daftar misi penyelamatan pangan terdekat beserta *live countdown* dan rekomendasi wadah bawaan. Saat diklaim, buka layar instruksi pintu belakang (*loading dock*) dan tampilkan QR Code serah terima. Pasang listener event `batch:state_transitioned`: jika waktu aman habis sebelum di-scan, kunci layar dengan banner merah *"Batas Aman Konsumsi Manusia Terlampaui — Batch Dialihkan"*.
* **Verifikasi:** Klaim batch dari tampilan Tier 1 dan pastikan QR code serta instruksi pintu belakang muncul.


* [ ] **4.4 Layar Peternak (Tier 2): Radar Biomasa Pakan & Kalkulator Nilai Ekonomis**
* **File:** `apps/mobile/src/app/(tier2-farmer)/index.tsx`, `apps/mobile/src/components/farmer/FeedValueCard.tsx`
* **Detail:** Tampilkan radar khusus batch berstatus `TIER_2_ANIMAL_ACTIVE` dengan tema warna Kuning-Oranye dan label tegas *"KHUSUS BIOMASA PAKAN TERNAK"*. Tampilkan konversi otomatis kilogram limbah menjadi estimasi jumlah larva Maggot BSF yang dapat diberi makan dan penghematan rupiah pakan komersial.
* **Verifikasi:** Picu perpindahan batch ke Tier 2 dan pastikan batch tersebut langsung muncul di layar Peternak beserta kalkulasi nilai pakannya.


* [ ] **4.5 Scanner QR Donatur & Verifikator HMAC Offline-First (Basement Mode)**
* **File:** `apps/mobile/src/app/(donor)/scanner.tsx`, `apps/mobile/src/utils/offlineHmacVerifier.ts`, `apps/mobile/src/store/useOfflineHandshakeQueue.ts`
* **Detail:** Buat pemindai QR menggunakan kamera Donatur. Jika perangkat *online*, panggil `POST /batches/:id/verify-handover`. Jika *offline* (atau timeout di *basement*), verifikasi tanda tangan `HMAC-SHA256` dan masa berlaku token secara lokal di perangkat, tampilkan layar sukses sementara, simpan bukti di antrean `AsyncStorage`, dan sinkronkan otomatis saat sinyal kembali.
* **Verifikasi:** Pindai QR dari layar Kurir menggunakan layar Donatur dan pastikan status berubah menjadi `COMPLETED`.



---

## Fase 5: Web Command Center, Legal Waiver Vault & Simulator Juri (Next.js 15)

Fase ini membangun dashboard layar lebar untuk proyektor panggung Hackathon, menampilkan visualisasi geospasial *real-time*, telemetri ESG, dan panel kendali simulasi *God-Mode*.

* [ ] **5.1 Layout Command Center & Integrasi Real-Time WebSocket Stream**
* **File:** `apps/web/package.json`, `apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/hooks/useRealtimeCommandCenter.ts`
* **Detail:** Bangun tata letak *dark-mode telemetry* dua kolom (Peta Geospasial di kiri, Stream Audit & Simulator di kanan, serta Bar Metrik ESG di bawah). Hubungkan ke Socket.io backend untuk memperbarui state peta dan metrik tanpa *page reload*.
* **Verifikasi:** Jalankan `pnpm --filter @sirkula/web dev` di port `3000` dan pastikan indikator status koneksi WebSocket menyala hijau (`LIVE CONNECTED`).


* [ ] **5.2 Kanvas Peta Geospasial Interaktif (Mapbox GL / Leaflet Dark Tiles)**
* **File:** `apps/web/src/components/map/TriageGeoMap.tsx`, `apps/web/src/components/map/BatchRippleMarker.tsx`
* **Detail:** Render titik lokasi aktor dan *batch* makanan aktif dengan cincin radar berdenyut (*pulsing ripple rings*) sesuai `current_ripple_radius_m`. Gunakan kode warna ketat: Hijau (`TIER_1_HUMAN_ACTIVE`), Kuning-Oranye (`TIER_2_ANIMAL_ACTIVE`), Merah (`TIER_3_COMPOST_ACTIVE`), dan garis vektor putus-putus yang menghubungkan lokasi kurir ke titik jemput saat berstatus `CLAIMED`.
* **Verifikasi:** Buat batch baru dari Mobile dan pastikan titik hijau muncul berkedip di peta Web dalam $< 200\text{ ms}$.


* [ ] **5.3 Panel God-Mode Time-Warp Simulator (Intervensi Suhu & Pembusukan Instan)**
* **File:** `apps/web/src/components/simulator/GodModePanel.tsx`
* **Detail:** Buat komponen kontrol interaktif untuk memilih *batch* aktif, menggeser *slider* suhu lingkungan ($20^\circ\text{C}\text{--}40^\circ\text{C}$), dan menekan tombol merah **"TRIGGER INSTANT BIO-THERMAL SPOILAGE"**. Hubungkan langsung ke `POST /api/v1/simulation/time-warp`.
* **Verifikasi:** Klik tombol *Trigger Spoilage* di Web; pastikan titik peta langsung berubah dari Hijau ke Kuning dan layar Mobile Tier 1 terkunci seketika.


* [ ] **5.4 Counter Telemetri Karbon ESG & Generator PDF Digital Liability Waiver**
* **File:** `apps/web/src/components/esg/EsgMetricsBar.tsx`, `apps/web/src/app/legal-vault/page.tsx`, `apps/web/src/components/legal/WaiverCertificateModal.tsx`
* **Detail:** Tampilkan counter animasi untuk Total Porsi Manusia Terselamatkan, Biomasa Pakan Maggot (kg), Emisi $CO_2e$ Dicegah (kg), dan Gas Metana $CH_4$ Dicegah (kg). Sediakan modal pratinjau & cetak PDF **Sertifikat Hukum Bebas Tuntutan (Digital Liability Waiver)** yang memuat nomor sertifikat, *SHA-256 signature hash*, suhu saat serah terima, dan stempel waktu kriptografis.
* **Verifikasi:** Selesaikan 1 siklus scan QR dan pastikan angka $CO_2e$ bertambah secara *live* serta dokumen Waiver dapat dibuka/dicetak ke PDF.



---

## Fase 6: End-to-End Koreografi Testing & Polish Demo Hackathon

Fase penutup untuk menguji integrasi lintas perangkat dan menyiapkan keandalan sistem di atas panggung presentasi.

* [ ] **6.1 Script Reset & Pre-Warming Demo Satu Klik**
* **File:** `packages/database/src/demo-reset.ts`, `package.json`
* **Detail:** Buat perintah `pnpm demo:prepare` yang membersihkan transaksi lama, menyisipkan 2 *batch* aktif awal di peta Bandung/Jakarta agar peta langsung terlihat hidup saat presentasi dibuka, dan mengosongkan antrean Redis yang menggantung.
* **Verifikasi:** Jalankan `pnpm demo:prepare` dan pastikan peta Web langsung menampilkan skenario awal yang bersih dan siap didemokan.


* [ ] **6.2 Gladi Bersih Skenario Dual-Screen (End-to-End Stress Test)**
* **File:** Seluruh modul `apps/backend`, `apps/web`, dan `apps/mobile`
* **Detail:** Jalankan pengujian berurutan:
1. Ambil foto makanan via Mobile (`DONOR`) $\rightarrow$ Pastikan muncul di peta Web (`TIER_1_HUMAN_ACTIVE`).
2. Klaim dari Mobile (`TIER_1_HUB`) $\rightarrow$ Pastikan garis rute muncul di peta Web.
3. Tekan *Trigger Spoilage* di Web Simulator $\rightarrow$ Pastikan akses Mobile `TIER_1_HUB` terkunci dan notifikasi pindah ke Mobile `TIER_2_FARMER`.
4. Klaim dari Mobile (`TIER_2_FARMER`) dan lakukan *Scan QR* dari Mobile (`DONOR`) $\rightarrow$ Pastikan counter $CO_2e$ di Web naik dan Sertifikat Waiver diterbitkan.


* **Verifikasi:** Seluruh alur selesai tanpa *error* di konsol dan waktu respons transisi antarmuka konsisten di bawah $200\text{ ms}$.