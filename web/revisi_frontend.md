# REVISI_FRONTEND.MD — Cetak Biru Revisi Total Frontend SIRKULA-AI
*Berdasarkan Keselarasan Mutlak terhadap Context: PRD.md, ARCHITECTURE.md, DESIGN.md, PLAN.md, & schema.sql*

---

## 1. Analisis Kesenjangan (Gap Analysis)

### Mengapa Frontend Saat Ini Berbeda dengan Context?
1. **Pencampuran Platform (Mobile Field vs Web Command Center):**
   - **Context (`PRD.md` Sec. 2 & `ARCHITECTURE.md` Sec. 2):** 
     - 4 Role Lapangan (`DONOR`, `TIER_1_HUB`, `TIER_2_FARMER`, `TIER_3_COMPOST`) dirancang dengan antarmuka **Mobile-First / Field App** (tata letak *Bottom Navigation Bar*, *Zero-UI Ingestion*, *GPS Radar Card*, dan *Dynamic QR Scanner*).
     - 2 Role Makro (`ESG_AUDITOR`, `SIMULATOR_ADMIN`) dirancang dengan antarmuka **Web Command Center** (layar lebar *Dark Mode*, *Mapbox GL Spatiotemporal Heatmap*, agregasi dampak karbon, dan *God-Mode Simulator*).
   - **Frontend Eksisting:**
     - Menjejalkan seluruh role ke dalam satu template dashboard desktop monolitik dengan sidebar statis dan formulir konvensional.
2. **Pelanggaran Prinsip Zero-Click Ingestion pada DONOR:**
   - **Context (`PRD.md` Sec. 3.1 & `DESIGN.md` Sec. 4.1):** Donatur **tidak boleh mengetik manual** nama makanan, porsi, berat, dan kategori risiko. Donatur cukup mengunggah 1 foto + 1 slider jam pemaparan (`Baru Matang`, `≤ 2 Jam`, `≤ 4 Jam`) + 1 toggle `Ruangan Ber-AC`. Backend Gemini 2.5 Flash + Weather API menghitung semuanya secara otomatis dalam waktu $\le 15\text{ detik}$.
   - **Frontend Eksisting:** Memaksa donatur mengisi 10+ kolom input teks manual (nama, porsi, kg, waktu masak, deskripsi, dsb), yang melanggar tujuan eliminasi friksi donatur pasca-operasional lelah.
3. **Ketiadaan PostGIS Radar Interaktif & Dynamic QR HMAC:**
   - **Context:**
     - Simpul Hub (Tier 1) dan Peternak (Tier 2) disajikan kartu radar pangan terdekat berbasis jarak meter dari koordinat PostGIS (`ST_DWithin` & `ST_Distance`).
     - Alur klaim menghasilkan Dynamic QR token terenkripsi HMAC yang berdetak mundur dan divalidasi dengan algoritma *Constant-Time Safe Comparison*.
   - **Frontend Eksisting:** Menggunakan tabel statis dan token demo acak tanpa visualisasi radar geospasial dan hitung mundur biothermal $Q_{10}$ yang presisi.
4. **Pemisahan Kontrol God-Mode Simulator:**
   - **Context (`PRD.md` Sec. 3.5 & `PLAN.md` Fase 7):** Simulator Admin memiliki panel intervensi khusus dewan juri untuk memanipulasi suhu lingkungan ($24^\circ\text{C} \rightarrow 36^\circ\text{C}$), memajukan jam simulasi (*time-warp*), dan memicu mutasi darurat *Safety Invariant Protocol* (`TIER_1` $\rightarrow$ `TIER_2`).
   - **Frontend Eksisting:** Panel simulasi bercampur di menu umum tanpa live telemetry feed.

---

## 2. Matriks Spesifikasi Role Sesuai Context

| Role Identifier | Platform Target | Persona Riil | Tanggung Jawab & Hak Akses Khusus | Antarmuka Kunci |
| :--- | :--- | :--- | :--- | :--- |
| **`DONOR`** | Mobile / Responsif Lapangan | Staf Katering, Pengelola Restoran, Pemilik Warteg, Panitia WO | Ingesti 1-klik foto sisa makanan, tentukan jam paparan, pantau timer $Q_{10}$, pindai QR kurir di loading dock untuk rilis *Digital Liability Waiver*. | 1. Kamera AI & Slider Paparan<br>2. Kartu Status Batch Aktif<br>3. Pemindai QR Handshake |
| **`TIER_1_HUB`** | Mobile / Responsif Lapangan | Marbot Masjid, Dapur Komunitas, Panti Asuhan, Pengurus RT/RW | Memantau radar makanan layak konsumsi manusia dalam radius 1.5–25 km, mengklaim kuota batch, membawa wadah rekomendasi, menunjukkan Dynamic QR token saat jemput. | 1. Radar Pangan Manusia ($Q_{10}$ Countdown)<br>2. Instruksi Loading Dock Spesifik<br>3. Layar Dynamic QR Token |
| **`TIER_2_FARMER`** | Mobile / Responsif Lapangan | Peternak Maggot BSF, Peternak Lele, Peternak Unggas Rakyat | Memantau radar biomassa pakan ternak (batch yang melewati masa aman manusia), klaim pakan (kg), hitung estimasi penghematan pakan (Rp 3.800/kg). | 1. Radar Biomasa Pakan ($t_{\text{safe}} + 12\text{h}$)<br>2. Kalkulator Konversi Nilai Pakan<br>3. Misi Jemputan Pakan |
| **`TIER_3_COMPOST`** | Mobile / Responsif Lapangan | Bank Sampah Induk, Unit Pengomposan TPST/TPS3R | Menerima alokasi residu organik batch Tier 3, konfirmasi penerimaan untuk konversi pencegahan gas metana ($CH_4$). | 1. Direktori Residu Organik<br>2. Konfirmasi Serah-Terima Kompos |
| **`ESG_AUDITOR`** | Web Dashboard (Layar Lebar) | Manajer CSR Korporasi, Dinas Lingkungan Hidup (DLH), Publik | Memantau sebaran titik radar penyelamatan se-kota, audit catatan serah-terima hukum, verifikasi metrik reduksi emisi karbon ($CO_2e$) dan gas metana. | 1. Command Center Heatmap<br>2. Legal Vault & Unduh Sertifikat Waiver<br>3. Telemetri Agregat ESG |
| **`SIMULATOR_ADMIN`** | Web Dashboard (Layar Lebar) | Dewan Juri Hackathon, Technical Lead, Administrator | Memiliki akses penuh (God-Mode): intervensi suhu cuaca, percepatan waktu inkubasi patogen, dan simulasi penolakan keselamatan pangan (*Safety Invariant*). | 1. Time-Warp Controller<br>2. Slider Manipulasi Suhu Cuaca<br>3. Trigger Spoilage Emergency |

---

## 3. Desain Sistem & Komponen UI (`DESIGN.md`)

### 3.1 Tema & Palet Warna
- **Field Interfaces (`DONOR`, `TIER_1_HUB`, `TIER_2_FARMER`, `TIER_3_COMPOST`):**
  - Menggunakan **Light Mode** bersih (`bg-base: #F5FAF9`, `surface: #FFFFFF`, `border: #E6F7F4`) demi keterbacaan tinggi di bawah sinar matahari saat operasional lapangan.
- **Command Center & Simulator (`ESG_AUDITOR`, `SIMULATOR_ADMIN`):**
  - Menggunakan **Dark Mode Eksklusif** (`bg-base: #0F172A`, `surface: #1E293B`, `border: #334155`, `text: #F8FAFC`).

### 3.2 Semantic Tokens
- **Primary (Emerald Teal):** `#0B7A6B` (Hover: `#085E52`, Dark: `#0E9F8B`).
- **Tier 1 (Safe Human / Success):** `#10B981` / `#34D399`.
- **Tier 2 (Animal Feed / Warning):** `#F59E0B` / `#FBBF24`.
- **Tier 3 (Compost / Decayed):** `#8B5CF6` / `#A78BFA`.
- **Danger / Bio-Expiry Breach:** `#EF4444` / `#F87171`.

### 3.3 Tipografi
- **Teks Umum & Label:** `Plus Jakarta Sans` (400, 500, 600, 700).
- **Kriptografi & Telemetri:** `JetBrains Mono` / monospace (untuk Waiver Hash, Timer $Q_{10}$, dan Koordinat GPS).

---

## 4. Rencana Revisi Alur Layar (Screen-by-Screen Roadmap)

### 4.1 Modul DONOR: Zero-Click Vision Ingestion (`/batches/new`)
- **Tampilan Form Baru:**
  1. **Upload/Kamera Utama:** Drag & drop atau ambil langsung foto makanan prasmanan.
  2. **Exposure Time Slider:** 3 opsi baku: `Baru Matang (0 min)`, `≤ 2 Jam Lalu (120 min)`, `≤ 4 Jam Lalu (240 min)`.
  3. **Toggle Ruangan:** Saklar switch `Ruangan Ber-AC (Suhu 22°C)` vs `Suhu Ruang Tropis`.
  4. **Tombol Eksekusi:** `Analisis & Rilis Batch via AI`.
- **Integrasi Backend:**
  - Request `POST /api/v1/batches/analyze-and-create` (Multipart Form).
  - Tampilkan modal hasil ekstraksi Gemini: Menu terdeteksi, kategori risiko mikrobiologi (`WET_COCONUT_MILK`, dsb), estimasi porsi, total berat (kg), rekomendasi wadah, suhu cuaca terdeteksi, dan batas waktu aman manusia ($t_{\text{safe}}$).

### 4.2 Modul TIER_1_HUB & TIER_2_FARMER: Radar Spasial & Misi Klaim
- **Tampilan Radar Baru (`/dashboard/food-batches`):**
  1. Filter otomatis berdasarkan role login (Hub hanya melihat `TIER_1_HUMAN_ACTIVE`; Farmer hanya melihat `TIER_2_ANIMAL_ACTIVE`).
  2. **Kartu Batch Radar:**
     - Indikator jarak meter (`ST_Distance`) dari lokasi pengguna.
     - Ringkasan menu dan estimasi porsi/berat.
     - **Bio-Thermal Countdown Timer Real-Time:** Menghitung sisa menit batas aman $Q_{10}$ dengan indikator visual berdetak.
     - Rekomendasi wadah logistik (misal: "Bawa 2 Box Kontainer").
  3. **Aksi Klaim:** Tombol `Ambil Misi Penyelamatan` memanggil `POST /api/v1/batches/:id/claim` (mengunci Redis Lock).
- **Layar Detail Misi (`/missions` atau `/batches/:id`):**
  - Tampilkan instruksi titik jemput spesifik (*handover point notes*, loading dock belakang).
  - Tampilkan **Dynamic QR Code** terenkripsi HMAC yang berlaku 60 menit untuk dipindai oleh donatur.

### 4.3 Modul DONOR: Loading Dock Handshake Scanner
- Tombol `Verifikasi Serah-Terima (Scan QR)` pada detail batch donatur.
- Memanggil `POST /api/v1/claims/verify-handover`.
- Menerbitkan dan menampilkan **Digital Liability Waiver** secara instan: nomor sertifikat unik, hash SHA-256, suhu serah-terima, dan legal disclaimer pembebasan tanggung jawab hukum.

### 4.4 Modul ESG_AUDITOR & SIMULATOR_ADMIN: Command Center Makro (`/dashboard`)
- **Layout Split Grid 65/35 (Dark Mode):**
  - **Sisi Kiri (65%):** Skematik Peta Radar Interaktif Kota Bandung dengan pulsing ripple marker (Hijau: Tier 1, Kuning: Tier 2, Ungu: Tier 3).
  - **Sisi Kanan (35%):**
    - **Feed Audit Log Real-Time:** Menangkap mutasi event WebSocket (`batch:created`, `batch:state_transitioned`, `batch:claimed`, `batch:handover_completed`).
    - **God-Mode Simulator Panel (Khusus SIMULATOR_ADMIN):**
      - Slider manipulasi suhu lingkungan ($24^\circ\text{C} - 36^\circ\text{C}$).
      - Tombol Time-Warp Clock (`+15 Menit`, `+1 Jam`, `+4 Jam`).
      - Tombol `Simulasi Pembusukan Darurat (Trigger Spoilage)` untuk mendemonstrasikan pengalihan otomatis ke pakan ternak di depan juri.
  - **Footer Bar:** Metrik Agregat Karbon & Pangan ($CO_2e$ avoided kg, $CH_4$ avoided kg, total kg biomassa, dan porsi).

### 4.5 Modul Legal Vault (`/legal-vault`)
- Registry seluruh sertifikat serah-terima yang telah terbit.
- Tabel audit memuat: No. Sertifikat, Hash Waiver, Donor, Penerima, Waktu Serah-Terima, Suhu Ambien, dan tombol pratinjau sertifikat digital resmi.

---

## 5. Rencana Eksekusi Bertahap (Action Plan)

| Tahap | Fokus Pekerjaan | File Terkait | Output Terverifikasi |
| :---: | :--- | :--- | :--- |
| **Fase 1** | **Refactor Data Model & Role Definition** | `web/src/data.js` | Ekosistem 6 role diselaraskan persis dengan `ActorRole` backend. Mock actor disesuaikan dengan koordinat riil seed database. |
| **Fase 2** | **Redesign Ingesti Donatur (Zero-Click AI Form)** | `web/src/views.js`, `web/src/main.js` | Form ingesti `/batches/new` diubah menjadi input foto + slider durasi + toggle AC. Porsi & berat dihitung otomatis via AI backend. |
| **Fase 3** | **Implementasi Radar Spasial & Bio-Thermal Countdown** | `web/src/views.js`, `web/src/store.js` | Tampilan radar untuk Tier 1 Hub dan Tier 2 Farmer dengan timer hitung mundur $Q_{10}$ dinamis dan klaim misi Redis lock. |
| **Fase 4** | **Handshake QR Dinamis & Digital Liability Waiver** | `web/src/views.js`, `web/src/api.js` | Tampilan Dynamic QR bagi penerima dan pemindai verifikasi bagi donatur yang menerbitkan sertifikat waiver SHA-256. |
| **Fase 5** | **Perombakan Command Center & God-Mode Simulator (Dark Mode)** | `web/src/views.js`, `web/src/styles.css` | Tampilan Command Center Web 65/35 Dark Mode untuk `ESG_AUDITOR` dan `SIMULATOR_ADMIN` lengkap dengan time-warp simulator. |
| **Fase 6** | **Integrasi WebSocket Event Listener Penuh** | `web/src/socket.js`, `web/src/store.js` | Update real-time marker peta, status badge, dan counter ESG saat event `batch:*` ditembakkan oleh gateway. |

---

*Dokumen ini menjadi standar acuan tunggal untuk seluruh perubahan kode pada direktori `web/`.*
