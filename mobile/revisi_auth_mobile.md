# Rencana Revisi Autentikasi Mobile SIRKULA-AI (`revisi_auth_mobile.md`)

Dokumen ini memuat rencana kerja (*implementation plan*) komprehensif untuk menyelaraskan sistem autentikasi dan pendaftaran akun pada aplikasi mobile React Native Expo (`mobile/`) dengan Web Command Center (`web/`) dan Backend NestJS (`backend/`) sesuai arsitektur `@context/ARCHITECTURE.md`, `@context/PLAN.md`, dan standar kepatuhan `@context/AGENTS.md`.

---

## 1. Analisis Kesenjangan (*Gap Analysis*)

| Komponen | Web Command Center (`web/`) | Mobile Eksisting (`mobile/`) | Target Penyelarasan |
|---|---|---|---|
| **Alur Masuk** | Formulir login email + password terhubung ke DB/API | Pilihan peran instan / 1-Tap dummy profile | Form login email/WA + password terhubung ke PostgreSQL via REST API |
| **Alur Pendaftaran** | Halaman `/register` (Nama, Email, Role, WA, Alamat, Kapasitas) $\rightarrow$ `POST /api/v1/auth/register` | **Tidak ada** halaman register sama sekali | Halaman `src/app/register.tsx` lengkap dengan integrasi `POST /api/v1/auth/register` |
| **Penyimpanan Sesi** | Menyimpan JWT token resmi, Actor ID unik PostgreSQL | Menggunakan mock ID statis dari `MOCK_ACTORS_MAP` | Menyimpan JWT access token dan entitas `Actor` riil dari PostgreSQL via `AsyncStorage` |
| **Interoperabilitas Akun** | Akun tersimpan di tabel database `actors` | Hanya mengenali profil lokal di memori HP | Akun yang didaftarkan di Web dapat login di Mobile, dan sebaliknya |
| **Hak Akses & Guard** | Validasi session token & route protection | Hanya flag boolean `isAuthenticated` lokal | Protected route guard: sesi tak terautentikasi diarahkan ke `/login` |

---

## 2. Arsitektur Data & Kontrak API Terintegrasi

### 2.1 Backend Endpoints (`apps/backend/src/modules/auth/`)
1. **`POST /api/v1/auth/register`**:
   * Menerima: `{ name, role, email, phone_whatsapp, address_full, latitude, longitude, daily_capacity_kg, handover_point_notes }`
   * Menyimpan entitas ke tabel PostgreSQL `actors` dengan lokasi spasial PostGIS `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`.
   * Mengembalikan: `{ access_token, token_type, expires_in_seconds, actor: { id, name, role, email, phone_whatsapp, address_full } }`.
2. **`POST /api/v1/auth/token`**:
   * Menerima: `{ actor_id }`
   * Menghasilkan JWT Bearer bertanda tangan `JWT_SECRET` dengan payload `{ sub, role, name }`.
3. **`GET /api/v1/auth/actors`**:
   * Mengambil seluruh aktor terdaftar/seeder dari PostgreSQL untuk validasi email/kredensial dan resolusi akun cepat.
4. **`GET /api/v1/auth/actors/:id`**:
   * Mengambil detail profil lengkap aktor berdasarkan ID.

---

## 3. Rencana Tahapan Eksekusi (*Step-by-Step Implementation*)

### Fase 1: Pembuatan Layanan API Autentikasi Mobile (`src/lib/api.ts`)
* **Tujuan:** Menyediakan fungsi HTTP resmi untuk pendaftaran akun dan verifikasi login ke backend NestJS.
* **Tugas:**
  1. Buat DTO interface `RegisterActorInput` dan `AuthResponse` sesuai kontrak backend.
  2. Implementasikan fungsi `registerActorApi(input: RegisterActorInput): Promise<AuthResponse>`.
  3. Implementasikan fungsi `loginActorApi(identifier: string, password: string): Promise<AuthResponse>`.
     * Menghubungi `GET /api/v1/auth/actors` untuk mencocokkan email/no. telepon yang terdaftar di PostgreSQL.
     * Jika cocok dan password valid (`Sirkula2026!` / password terdaftar), panggil `POST /api/v1/auth/token` untuk memperoleh JWT resmi.
  4. Nonaktifkan ketergantungan mock statis saat online.

### Fase 2: Refaktor State Management Sesi (`src/store/useActorStore.ts`)
* **Tujuan:** Menjadikan entitas `Actor` dari database dan JWT token sebagai *single source of truth* sesi pengguna mobile.
* **Tugas:**
  1. Tambahkan state `token: string | null` dan `currentActor: Actor | null` ke dalam `ActorStoreState`.
  2. Perbarui method `login` agar menerima objek `Actor` utuh dan `token` dari respons backend API.
  3. Perbarui `buildActorHeaders` agar secara dinamis menggunakan ID asli aktor (`currentActor.id`) dan perannya.
  4. Perbarui method `logout` agar membersihkan token, entitas aktor, dan cache query TanStack.
  5. Konfigurasikan migrasi skema `AsyncStorage` (`sirkula.actor.session.v3`).

### Fase 3: Pembuatan Halaman Pendaftaran Baru (`src/app/register.tsx`)
* **Tujuan:** Menyediakan antarmuka pendaftaran akun lapangan yang sejajar dengan web.
* **Tugas:**
  1. Buat screen baru `mobile/src/app/register.tsx` menggunakan komponen UI SIRKULA (`ScreenContainer`, `Button`, `Input`).
  2. Formulir mencakup field:
     * **Nama Organisasi / Usaha:** (contoh: *Katering Barokah*, *Panti Asuhan Al-Falah*, *Peternak BSF Cimahi*).
     * **Peran Lapangan:** Radio picker untuk 3 peran lapangan (`DONOR`, `TIER_1_HUB`, `TIER_2_FARMER`).
     * **Email Resmi:** Validasi format email RFC 5322.
     * **No. WhatsApp:** Validasi format nomor seluler Indonesia (`+62` / `08`).
     * **Alamat Lengkap & Titik Temu:** Alamat fisik dan catatan loading dock.
     * **Kata Sandi:** Minimal 6 karakter.
  3. Integrasikan geolokasi default Kota Bandung (`-6.8863`, `107.6080`) atau koordinat GPS perangkat.
  4. Hubungkan tombol submit ke `registerActorApi()`, simpan sesi di Zustand, dan arahkan langsung ke dashboard peran yang sesuai.
  5. Sediakan tombol navigasi "Sudah punya akun? Masuk ke sini" menuju `/login`.

### Fase 4: Penyelarasan Halaman Masuk (`src/app/login.tsx`)
* **Tujuan:** Mengubah layar login agar melakukan autentikasi riil terhadap database PostgreSQL.
* **Tugas:**
  1. Ubah tab "Masuk Akun Mitra" agar memanggil `loginActorApi(identifier, password)`.
  2. Tambahkan pesan error interaktif jika email/nomor tidak ditemukan di database atau password salah.
  3. Pada tab "Login Cepat Juri (1-Tap)", hubungkan akun demo ke UUID aktor seeder PostgreSQL yang sebenarnya:
     * `DONOR`: `a0000000-0000-0000-0000-000000000001` (Sabuga ITB)
     * `TIER_1_HUB`: `b0000000-0000-0000-0000-000000000001` (Masjid Al-Ukhuwah)
     * `TIER_2_FARMER`: `c0000000-0000-0000-0000-000000000001` (Bio-Larva Cibiru)
  4. Ambil token JWT resmi dari backend untuk akun juri tersebut sebelum masuk, sehingga seluruh request REST dan WebSocket terotentikasi penuh.
  5. Tambahkan tautan "Belum memiliki akun? Daftar akun baru" menuju `/register`.

### Fase 5: Penyelarasan Rute & Guard Navigasi (`src/app/_layout.tsx` & `src/app/index.tsx`)
* **Tujuan:** Menjaga integritas rute dan mencegah navigasi liar tanpa autentikasi.
* **Tugas:**
  1. Daftarkan `<Stack.Screen name="register" />` di `mobile/src/app/_layout.tsx`.
  2. Tambahkan kondisi `hideRoleHeader` untuk rute `register`.
  3. Perbarui `index.tsx` (Splash Screen) agar memeriksa `isAuthenticated` dan `token` sebelum mengarahkan ke dashboard.
  4. Pasang guard di setiap layout dashboard (`(donor)`, `(tier1-hub)`, `(tier2-farmer)`) agar jika sesi kosong langsung diarahkan ke `/login`.

### Fase 6: Penyelarasan WebSocket Token Handshake (`src/hooks/useSocketSync.ts`)
* **Tujuan:** Memastikan koneksi WebSocket mobile menggunakan token JWT asli aktor yang sedang login.
* **Tugas:**
  1. Kirim JWT Bearer token yang tersimpan di `useActorStore` saat melakukan *handshake* Socket.io.
  2. Pastikan socket otomatis bergabung ke room privat `room:actor:${currentActor.id}` dan room peran `room:${activeRole}`.

---

## 4. Matriks Verifikasi & Kriteria Keberhasilan

1. **Uji Lintas Platform (Web $\rightarrow$ Mobile):**
   * Buat akun baru di Web Command Center (`http://localhost:3000/register`).
   * Buka Mobile App (`/login`), masukkan email dan password yang baru dibuat di Web.
   * **Hasil Diharapkan:** Mobile berhasil login, profil dan ID di mobile identik dengan baris data di tabel `actors` PostgreSQL.
2. **Uji Lintas Platform (Mobile $\rightarrow$ Web):**
   * Buat akun baru di Mobile App (`/register`).
   * Buka Web Command Center (`http://localhost:3000/login`), masukkan email dan password tersebut.
   * **Hasil Diharapkan:** Web berhasil login dan menampilkan dashboard peran akun tersebut.
3. **Uji Handshake WebSocket:**
   * Login di mobile sebagai `TIER_1_HUB`.
   * Buat batch baru di web sebagai `DONOR`.
   * **Hasil Diharapkan:** Mobile menerima broadcast event `batch:created` secara real-time tanpa refresh.
4. **Kepatuhan Aturan Teknis (`@context/AGENTS.md`):**
   * `strict: true` TypeScript tanpa `any` liar.
   * Tidak ada silent fallback ke data palsu saat backend aktif.
   * Validasi Zod pada seluruh DTO request/response.
