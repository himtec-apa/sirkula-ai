# Product Requirements Document (PRD): SIRKULA-AI

## 1. Project Overview & Objectives

### 1.1 Latar Belakang & Masalah

* **Time-Decay & Friction Donatur:** Sumber *food waste* terbesar dan paling rentan di perkotaan Indonesia berasal dari sisa prasmanan acara (pernikahan, seminar) dan warung makan malam hari (Warteg, RM Padang). Makanan berkuah dan bersantan mengalami percepatan pembusukan di iklim tropis ($< 3\text{ jam}$). Donatur enggan menyumbangkan makanan karena proses input data manual yang rumit di saat fisik mereka sudah kelelahan pasca-operasional.
* **Stigma Sosial & Erosi Martabat:** Sistem pembagian makanan langsung ke individu di ruang publik menimbulkan rasa malu bagi penerima yang membutuhkan serta memicu antrean fisik yang rentan rusuh.
* **Liability Fear (Ketakutan Hukum & Reputasi):** Restoran dan hotel enggan mendonasikan sisa makanan layak konsumsi karena takut dituntut pidana/perdata atau dihujat publik jika terjadi insiden keracunan akibat keterlambatan konsumsi.
* **Dead-End Disposal:** Ketika makanan lewat batas aman manusia dan tidak ada yang mengambil, makanan langsung dibuang ke TPA, menghasilkan emisi gas metana ($CH_4$). Padahal, ekosistem peternak lokal (Maggot BSF, ikan lele, unggas) membutuhkan pasokan biopakan harian dalam jumlah masif.

### 1.2 Solusi: SIRKULA-AI

Platform penyelamatan pangan terpadu (*Unified Multi-Platform*) yang menggabungkan:

1. **Zero-Click Vision Ingestion:** Ekstraksi porsi, berat, dan kategori risiko pangan dari 1 lembar foto via Multimodal Vision AI.
2. **Bio-Thermal Dynamic Engine:** Penentuan masa aman biologis pangan secara presisi berdasarkan suhu dan kelembapan cuaca lokal riil ($Q_{10}\text{ decay}$).
3. **Automated 3-Tier State Triage:** Pengalihan target klaim makanan secara otomatis dan tanpa kompromi (Manusia $\rightarrow$ Pakan Maggot/Ternak $\rightarrow$ Kompos).
4. **Dignity-First Routing & Digital Liability Shield:** Penjemputan tertutup oleh Simpul Komunitas terverifikasi (bukan perorangan) dengan penerbitan sertifikat pembebasan tanggung jawab hukum berbasis kriptografi.

### 1.3 Target Metrik Keberhasilan (MVP Hackathon)

* Durasi input donatur dari buka kamera hingga rilis sistem: $\le 15\text{ detik}$.
* Latensi inferensi Multimodal Vision AI + Bio-Thermal calculation: $\le 2.5\text{ detik}$.
* Nol insiden keracunan pangan (*zero breach*) berkat penguncian otomatis hak klaim manusia saat ambang batas aman tercapai.
* Sinkronisasi mutasi status lintas platform (Mobile $\leftrightarrow$ Web): $\le 200\text{ ms}$ via WebSocket.

---

## 2. User Roles & Permissions

| Role Identifier | Deskripsi Aktor | Platform Akses | Hak Akses & Kewenangan Khusus |
| --- | --- | --- | --- |
| `DONOR` | Staf Katering, Pengelola Restoran, Pemilik Warteg, Panitia WO. | Mobile App | Ambil foto via kamera, tentukan jam paparan awal, tinjau hasil AI, rilis *batch*, pindai QR serah terima kurir. |
| `TIER_1_HUB` | Marbot Masjid, Pengurus RT/RW, Panti Asuhan, Asrama Mahasiswa. | Mobile App | Akses radar makanan layak konsumsi manusia, klaim kuota *batch*, dapatkan QR *token* dinamis, akses alamat penjemputan spesifik. |
| `TIER_2_FARMER` | Peternak Maggot BSF, Peternak Lele, Peternak Unggas. | Mobile App | Akses radar biomasa pakan ternak (Tier 2), klaim volume pakan (kg), dapatkan QR penjemputan pakan. |
| `TIER_3_COMPOST` | Pengurus Bank Sampah Organik, Komunitas Kompos. | Mobile App | Akses batch terdegradasi Tier 3 untuk rute jemputan terjadwal. |
| `ESG_AUDITOR` | Manajer CSR Korporasi, Dinas Lingkungan Hidup (DLH), Publik. | Web Dashboard | Akses *live heatmap*, unduh Sertifikat Digital Waiver (PDF), pantau telemetri karbon ($CO_2e$), rekap audit limbah. |
| `SIMULATOR_ADMIN` | Dewan Juri Hackathon & Technical Lead. | Web Dashboard | Panel intervensi *God-Mode*: modifikasi suhu lingkungan, paksa percepatan waktu (*time-warp*) untuk menguji *state transition*. |

---

## 3. Core Features & User Flows

### 3.1 Feature 1: Zero-Click AI Food Ingestion & Bio-Thermal Estimator (Mobile)

* **Deskripsi:** Mengubah citra visual makanan menjadi inventaris logistik dan parameter waktu aman biologis tanpa pengetikan teks manual.
* **User Flow (Donatur):**
1. Donatur membuka Mobile App (langsung berada pada mode kamera).
2. Donatur mengambil 1 foto meja prasmanan/etalase dan menggeser 1 *slider* jam pemaparan (pilihan: Baru Matang, $\le 2\text{ jam}$, $\le 4\text{ jam}$).
3. Donatur menekan tombol **"Analisis & Selamatkan"**.
4. Sistem menampilkan kartu pratinjau: estimasi porsi, berat (kg), menu berisiko tertinggi, suhu sekitar, dan sisa hitung mundur aman manusia.
5. Donatur menekan **"Konfirmasi Rilis"**.



### 3.2 Feature 2: Automated 3-Tier Bio-Thermal Triage Engine (Backend Service)

* **Deskripsi:** *State machine* mandiri yang memindahkan kepemilikan akses pangan secara bertingkat berdasarkan kalkulasi mikrobiologi riil.
* **System Flow (Otomatis):**
1. Batch terdaftar dengan status `TIER_1_HUMAN_ACTIVE`.
2. Backend menjadwalkan *delayed execution* di Redis sesuai hitungan $t_{\text{safe}}$.
3. Jika kurir Tier 1 tidak menyelesaikan serah terima sebelum $t_{\text{safe}}$:
* Status bermutasi ke `TIER_2_ANIMAL_ACTIVE`.
* Hak akses Tier 1 diputus permanen.
* Web Push/WhatsApp ditembakkan ke radar peternak Maggot/Lele terdekat.


4. Setelah melewati ambang batas $t_{\text{safe}} + 12\text{ jam}$, status bermutasi ke `TIER_3_COMPOST_ACTIVE`.



### 3.3 Feature 3: Dignity-First Blind Handshake (Mobile)

* **Deskripsi:** Penjemputan logistik terstruktur untuk menjaga martabat penerima dan ketertiban area donatur.
* **User Flow (Simpul Komunitas / Peternak):**
1. Aktor menerima notifikasi geospasial berdasarkan radius PostGIS.
2. Aktor membuka Mobile App, meninjau estimasi porsi/kg dan rekomendasi wadah logistik yang harus dibawa.
3. Aktor menekan tombol **"Ambil Misi Penyelamatan"** (mengunci kuota via Redis Lock).
4. Peta navigasi membuka instruksi titik jemput spesifik (*loading dock* belakang).
5. Aplikasi menghasilkan **Dynamic QR Code** terenkripsi HMAC yang diperbarui setiap 30 detik.
6. Di lokasi, Donatur memindai QR code kurir; sistem memverifikasi validitas *token*, menyelesaikan *batch*, dan menerbitkan Digital Waiver.



### 3.4 Feature 4: Command Center & Real-Time Geospatial Monitor (Web)

* **Deskripsi:** Antarmuka pengawasan makro untuk kota, auditor CSR, dan presentasi dewan juri.
* **User Flow (Auditor/Juri):**
1. Pengguna membuka Web Command Center di desktop/proyektor.
2. Peta interaktif (Mapbox GL) menampilkan sebaran *batch* aktif secara *real-time*:
* Titik Hijau: Makanan Tier 1 (Aktif untuk Manusia).
* Titik Kuning: Pakan Tier 2 (Peternak Maggot/Lele).
* Titik Merah: Kompos Tier 3.


3. Mengklik titik menampilkan telemetri mikro: komposisi masakan, suhu ruang donor, masa inkubasi patogen, dan garis vektor kurir penjemput.
4. Metrik agregat (kg makanan terselamatkan, metrik gas $CO_2e$) beranimasi naik secara *live* saat terjadi pemindaian QR di Mobile.



### 3.5 Feature 5: God-Mode Time-Warp Simulator (Web Khusus Demo)

* **Deskripsi:** Instrumen pengendali kondisi simulasi untuk membuktikan keandalan sistem kepada juri tanpa harus menunggu durasi basi sesungguhnya.
* **User Flow (Admin/Juri):**
1. Pengguna memilih salah satu *batch* aktif di layar Web.
2. Menggeser *slider* suhu lingkungan dari $24^\circ\text{C}$ ke $36^\circ\text{C}$ $\rightarrow$ Timer batas aman di Mobile dan Web memendek seketika.
3. Menekan tombol **"Simulasi Kadaluarsa Manusia (Trigger Spoilage)"** $\rightarrow$ Sistem seketika mengunci kartu di Mobile Warga, membunyikan notifikasi darurat pakan di Mobile Peternak, dan mengubah warna titik di Web Mapbox menjadi kuning dalam waktu $< 100\text{ ms}$.



---

## 4. Functional Requirements

### 4.1 Logika Bisnis & Siklus Hidup Status (State Machine)

Entitas `food_batches` wajib tunduk pada aturan transisi status berikut:

```
[INIT] 
  │
  ▼
[TIER_1_HUMAN_ACTIVE] ──(Klaim Simpul)──► [TIER_1_CLAIMED]
  │                                            │
  │ (Waktu t_safe habis)                       │ (Scan QR Sukses)
  ▼                                            ▼
[TIER_2_ANIMAL_ACTIVE] ◄──(Gagal Scan/Basi)────┤
  │                                            │
  ├──(Klaim Peternak)──► [TIER_2_CLAIMED]      │
  │                           │                │
  │ (t_safe + 12h habis)      ▼ (Scan QR)      ▼
  ▼                      [COMPLETED] ◄─────────┘
[TIER_3_COMPOST_ACTIVE]
  │
  ▼ (Pick up Kompos)
[COMPLETED]

```

* **Transisi Pembatalan Paksa (Safety Invariant):** Jika *batch* berada dalam status `TIER_1_CLAIMED`, namun kurir belum memindai QR hingga waktu `tier1_expires_at` tercapai, status **wajib dipaksa mutasi** menjadi `TIER_2_ANIMAL_ACTIVE`. Tombol validasi QR untuk konsumsi manusia otomatis ditolak oleh backend demi keselamatan pangan.

### 4.2 Algoritma Model Bio-Thermal Spoilage

Sistem wajib menghitung estimasi waktu aman ($t_{\text{safe}}$) menggunakan adaptasi hukum laju pertumbuhan mikroorganisme Arrhenius ($Q_{10}$ temperature coefficient):

$$t_{\text{safe}} = \max\left(0, \left(t_{\text{base}} \times Q_{10}^{-\left(\frac{T_{\text{ambient}} - T_{\text{ref}}}{10}\right)} \times \left[1 - \alpha \cdot \max\left(0, \frac{RH - 70}{30}\right)\right]\right) - t_{\text{exposed}} - t_{\text{buffer}}\right)$$

* **Konstanta Baku:**
* $Q_{10} = 2.2$ (Peningkatan laju pembusukan per kenaikan $10^\circ\text{C}$).
* $T_{\text{ref}} = 25.0^\circ\text{C}$ (Suhu rujukan ruang standar).
* $\alpha = 0.15$ (Faktor penalti percepatan kondensasi kelembapan udara).
* $t_{\text{buffer}} = 20\text{ menit}$ (Batas toleransi penanganan kurir).


* **Klasifikasi $t_{\text{base}}$ dari Vision AI:**
* `WET_COCONUT_MILK` (Santan/Gulai/Opor): $120\text{ menit}$.
* `WET_NON_COCONUT` (Sop/Capcay basah/Soto): $180\text{ menit}$.
* `MOIST_PROTEIN_CARB` (Nasi putih/Mie/Ayam bumbu): $240\text{ menit}$.
* `DRY_FRIED` (Gorengan kering/Rendang kering): $360\text{ menit}$.
* `BAKERY_PASTRY` (Roti/Kue basah): $300\text{ menit}$.



### 4.3 Spesifikasi Algoritma Geospasial (Ripple Broadcast)

Pencarian penerima menggunakan fungsi spasial PostGIS:

1. Tahap 1: Query simpul dalam radius awal $1.500\text{ meter}$.
```sql
ST_DWithin(actors.location, donor_batch.location, 1500)

```


2. Tahap 2: Jika dalam $10\text{ menit}$ tidak ada klaim dari Tier 1, perluas radius otomatis menjadi $3.000\text{ meter}$, lalu $5.000\text{ meter}$.
3. Lokasi presisi donor disamarkan (*obfuscated*) ke publik umum dengan menambahkan pergeseran acak (*jitter*) sebesar $200\text{--}300\text{ meter}$ sampai status berubah menjadi `CLAIMED`.

### 4.4 Pencegahan Akses Bersamaan (Concurrency & Race Conditions)

Proses klaim *batch* wajib dilindungi dengan **Distributed Lock Redis** menggunakan perintah atomik:

```
SET lock:batch:<batch_id> <user_id> NX EX 10

```

Jika nilai kembalian `NULL`, sistem melempar respons `HTTP 409 Conflict` (*"Batch sedang diklaim oleh entitas lain"*).

### 4.5 Rumus Perhitungan Telemetri ESG

Dampak lingkungan dihitung otomatis saat transaksi berstatus `COMPLETED`:


$$\text{CO}_2\text{e Avoided (kg)} = \text{Total Weight (kg)} \times 2.5$$

$$\text{Methane Avoided (kg } CH_4) = \text{Total Weight (kg)} \times 0.15$$

### 4.6 Skema Data Inti (Data Contracts)

#### Endpoint: `POST /api/v1/batches/analyze-and-create`

* **Request (Multipart Form Data):**
* `image`: Binary file (JPEG/PNG, maks 5MB).
* `latitude`: Float (Double Precision).
* `longitude`: Float (Double Precision).
* `exposed_minutes`: Integer (Waktu sejak matang dalam menit).
* `is_ac_room`: Boolean.


* **Response Output (201 Created):**
```json
{
  "batch_id": "uuid-v4",
  "detected_items": [
    {
      "menu_name": "Gulai Cincang Sapi",
      "category": "WET_COCONUT_MILK",
      "portions": 40,
      "weight_kg": 10.0
    }
  ],
  "environmental_metrics": {
    "ambient_temp_c": 31.5,
    "humidity_pct": 78,
    "effective_temp_c": 31.5
  },
  "bio_thermal_timings": {
    "base_shelf_life_min": 120,
    "safe_window_human_min": 68,
    "tier1_expires_at": "2026-11-07T09:25:00.000Z",
    "tier2_expires_at": "2026-11-07T21:25:00.000Z"
  },
  "current_state": "TIER_1_HUMAN_ACTIVE"
}

```



#### WebSocket Event: `batch:state_transitioned`

* **Broadcast Payload:**
```json
{
  "event": "batch:state_transitioned",
  "batch_id": "uuid-v4",
  "previous_state": "TIER_1_HUMAN_ACTIVE",
  "new_state": "TIER_2_ANIMAL_ACTIVE",
  "reason": "BIO_THERMAL_LIMIT_EXCEEDED",
  "next_expires_at": "2026-11-07T21:25:00.000Z",
  "eligible_role": "TIER_2_FARMER"
}

```



---

## 5. Scope & Limitations

### 5.1 In-Scope (MVP Hackathon 24–48 Jam)

* **Mobile Engine:** Antarmuka kamera terintegrasi, pemindaian QR code via kamera native, layar dinamis berbasis *role-switching* manual (`DONOR`, `TIER_1_HUB`, `TIER_2_FARMER`).
* **AI & Bio-Thermal:** Integrasi langsung ke Gemini 2.5 Flash API dengan *Strict JSON Schema Output* dan integrasi ke OpenWeatherMap API berdasarkan lat/long.
* **Realtime Sync:** WebSocket Pub/Sub untuk sinkronisasi pembaruan status antara Mobile dan Web Command Center.
* **Web Dashboard:** Peta interaktif Mapbox GL, visualisasi radius PostGIS, live counter ESG, dan panel simulasi *God-Mode* (pengubah suhu dan *time-warp* paksa).
* **Legal Waiver:** Pembuatan rekaman hash SHA-256 transaksi sebagai representasi sertifikat digital pembebasan sengketa.

### 5.2 Out-of-Scope (Fase Pasca-Hackathon / Ditunda)

* Sistem pembayaran dan pencairan dana donasi/subsidi silang perbankan (Payment Gateway).
* Sensor fisik IoT (termokopel) yang dipasang langsung di dalam kotak wadah makanan.
* Integrasi jalur logistik dengan armada ojek online komersial (GoSend/GrabExpress API).
* Verifikasi legalitas organisasi panti asuhan/RT menggunakan integrasi Dukcapil/Kemenkumham.
* PWA multi-bahasa (fokus tunggal: Bahasa Indonesia).

---

## 6. Edge Cases & Error Handling

| Kondisi Kegagalan (Edge Case) | Mekanisme Deteksi | Tindakan Mitigasi Sistem (Error Handling) |
| --- | --- | --- |
| **Double-Claim Tabrakan:** Dua kurir mengklaim batch yang sama pada detik yang sama. | Redis Distributed Lock (`SETNX`) gagal di salah satu *request*. | Request pertama sukses; request kedua mengembalikan respons `409 Conflict` dengan pesan: *"Batch telah diambil simpul lain"*, lalu otomatis me-refresh daftar feed mobile. |
| **Offline di Loading Dock:** Kurir atau donor kehilangan koneksi seluler di basement gedung. | Jaringan timeout saat memverifikasi QR code serah terima. | QR code memuat payload JWT mandiri dengan tanda tangan HMAC-SHA256 offline. Aplikasi donor memverifikasi validitas *signature* secara lokal tanpa internet, menyimpan status di penyimpanan lokal, dan melakukan sync background saat sinyal kembali. |
| **Keterlambatan Kurir Menembus Batas Aman:** Kurir Tier 1 sudah mengklaim, tetapi terjebak macet dan tiba setelah $t_{\text{safe}}$ habis. | Redis BullMQ worker mendeteksi `now() >= tier1_expires_at` saat status masih `TIER_1_CLAIMED`. | Sistem membatalkan klaim Tier 1 secara sepihak, membatalkan validitas QR token kurir manusia, membunyikan notifikasi pembatalan di HP kurir demi keamanan pangan, dan mengalihkan status ke `TIER_2_ANIMAL_ACTIVE`. |
| **Gagal Deteksi Citra AI:** Foto buram, gelap, atau objek tidak dikenali oleh Gemini Vision. | Respons JSON parser error atau array `detected_items` kosong. | Backend beralih ke fallback default: Kategori `MOIST_PROTEIN_CARB`, estimasi berat default $5\text{ kg}$, $t_{\text{base}} = 120\text{ menit}$, dan memunculkan dialog koreksi satu ketukan di layar mobile donatur. |
| **Kegagalan Weather API:** Layanan cuaca pihak ketiga down atau rate-limit tercapai. | Timeout koneksi HTTP API Cuaca ($> 1.000\text{ ms}$). | Sistem menggunakan data lingkungan fallback standar iklim tropis perkotaan Indonesia: Suhu $T = 30.0^\circ\text{C}$, Kelembapan $RH = 75\%$. Log anomali dicatat ke sistem audit. |
| **No-Show Peternak di Tier 2:** Tidak ada peternak yang mengambil pakan hingga masa simpan ternak habis. | Redis TTL kedua ($t_{\text{safe}} + 12\text{ jam}$) kedaluwarsa. | Status otomatis beralih ke `TIER_3_COMPOST_ACTIVE`, memasukkan batch ke rute terjadwal penjemputan sampah organik massal oleh bank sampah mitra. |