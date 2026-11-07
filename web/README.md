# SIRKULA-AI: Web Application Dashboard

Aplikasi web mobile-first berbasis Modern Vanilla ES Modules, terintegrasi penuh dengan backend NestJS, basis data PostgreSQL + PostGIS, dan WebSocket Gateway.

---

## 1. Tech Stack

- **Frontend Engine**: Vanilla ES Modules (Tanpa bundler rumit, eksekusi native di browser)
- **Pemetaan Geospasial**: Leaflet JS + OpenStreetMap Tile Layer
- **Komunikasi Real-Time**: Socket.io Client v4
- **State Management**: Reactive Central Store (`src/store.js`) dengan sesi JWT & Safe Merge
- **Server Penayangan**: Node.js HTTP Server (`server.cjs`)
- **Desain & Aset**: Mobile-first CSS kustom + Brand Logo Resmi Sirkula

---

## 2. Struktur Proyek Web

```
web/
├── assets/                 # Logo, favicon, dan ikon grafis aplikasi
├── src/
│   ├── api.js              # HTTP client terhubung ke Backend NestJS (/api/v1)
│   ├── socket.js           # Client WebSocket untuk sinkronisasi event real-time
│   ├── store.js            # Central state management & autentikasi JWT
│   ├── views.js            # Renderer antarmuka berbasis peran (Donor, Hub, dsb.)
│   ├── styles.css          # Desain sistem & style token tema
│   └── app.js              # Entrypoint inisialisasi aplikasi
├── scripts/
│   ├── check.js            # Skrip validasi sintaks JavaScript & rute aset
│   └── smoke.mjs           # Smoke test penayangan HTTP server
├── index.html              # Shell HTML utama
├── server.cjs              # HTTP Server statis Node.js (Port 3000)
├── Dockerfile              # Container image frontend
└── package.json
```

---

## 3. Sinkronisasi Data dengan Aplikasi Mobile & Persistensi Donatur

Aplikasi web tidak lagi menggunakan data tiruan lokal (*mock*). Seluruh transaksi, autentikasi, dan status batch tersinkronisasi 1:1 dengan aplikasi mobile:
- **Autentikasi Terpusat**: Login memvalidasi kredensial langsung ke backend `POST /api/v1/auth/login` menggunakan token JWT.
- **Persistensi Donasi Pasca Logout**: Saat donatur membuat batch melalui Vision Ingestion, `createBatch` langsung mengikat `batch_id` PostgreSQL. Ketika donatur logout dan login kembali, `syncBackendData` memuat seluruh batch milik donatur melalui kueri kepemilikan backend dan melakukan penggabungan data aman (*safe merge*).
- **Katalog Batch Terpadu**: Menampilkan data batch aktif yang sama dengan yang dipublikasikan dari aplikasi mobile.
- **Transisi Status Real-Time**: Menerima event WebSocket `batch:created`, `batch:claimed`, dan `batch:state_changed` secara simultan dengan perangkat mobile.

---

## 4. Kredensial Masuk Web

Gunakan salah satu dari 13 akun canonical Bandung berikut (Password: `password123`):

| Peran | Akun Email | Nama Entitas |
|---|---|---|
| **DONOR** | `catering@sabuga.itb.ac.id` | Sabuga ITB |
| **DONOR** | `fnb@savoyhomann.com` | Hotel Savoy Homann |
| **DONOR** | `warteg.dago@gmail.com` | Warteg Bahari Dago |
| **TIER_1_HUB** | `marbot@alukhuwah-bandung.org` | DKM Masjid Al-Ukhuwah |
| **TIER_1_HUB** | `pengurus@pantialfien.org` | Panti Asuhan Al-Fien |
| **TIER_2_FARMER** | `maggot.cibiru@gmail.com` | Bio-Larva Maggot BSF |
| **TIER_3_COMPOST** | `banksampah.baksil@bandung.go.id` | Bank Sampah Baksil |
| **ESG_AUDITOR** | `auditor@dlh.bandung.go.id` | Auditor DLH Kota Bandung |
| **SIMULATOR_ADMIN** | `admin@sirkula.ai` | Admin Simulasi HIMTEC |

---

## 5. Menjalankan Aplikasi Web

### Opsi A: Jalankan Lokal via Node.js
```bash
cd web

# 1. Jalankan server lokal
npm run dev

# 2. Buka browser pada URL:
# http://localhost:3000
```

### Opsi B: Jalankan via Docker
```bash
# Dari root repositori:
docker compose up -d frontend
```

### Skrip Pengujian & Verifikasi
```bash
# Periksa integritas sintaks dan route
npm run check

# Jalankan smoke test server HTTP
npm run smoke
```
