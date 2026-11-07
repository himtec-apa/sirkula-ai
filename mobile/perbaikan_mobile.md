# Dokumentasi Perbaikan Konektivitas Mobile SIRKULA-AI (`perbaikan_mobile.md`)

Dokumen ini memuat panduan komprehensif mengenai analisis masalah, akar penyebab (*root cause*), tahapan perbaikan teknis (*step-by-step*), dan petunjuk verifikasi integrasi antara aplikasi mobile React Native Expo (`mobile/`) dengan backend NestJS (`backend/`).

---

## 1. Hasil Audit & Diagnostik Knowledge Graph (`/graphify`)

Berdasarkan hasil pemindaian struktur AST terhadap 75 file sumber pada modul `mobile/src` (425 nodes, 1.579 edges, 17 komunitas):
* **Node Inti (*God Nodes*):** `BatchWithItems`, `useActorStore`, `ActorRole`, `useActorHeaders`, `ScreenContainer`.
* **Keterkaitan Antar-Komunitas:** Terdeteksi bahwa komunitas *Environment Config & API Client* terhubung langsung ke *Local Mock Server & Expiration Handler* dan *WebSocket Sync*.
* **Temuan Diagnostik:** Aplikasi mobile memiliki mekanisme *silent fallback* ke `mockServer` lokal setiap kali permintaan jaringan ke backend mengembalikan status error (`500 Internal Server Error` atau `Network request failed`).

---

## 2. Akar Masalah (*Root Causes*)

### Masalah 1: Bug SQL Enum Mismatch di Backend (`batches.service.ts`)
* **Lokasi:** `backend/apps/backend/src/modules/batches/batches.service.ts:347`
* **Kode Lama:**
  ```sql
  SELECT id FROM rescue_claims 
  WHERE batch_id = $1 AND receiver_id = $2 
    AND status IN ('ACTIVE_EN_ROUTE', 'COMPLETED')
  ```
* **Penyebab:** Kolom `rescue_claims.status` bertipe `claim_status_enum` yang hanya menerima:
  * `ACTIVE_EN_ROUTE`
  * `HANDOVER_COMPLETED`
  * `EXPIRED_AUTO_REVOKED`
  * `CANCELLED_BY_RECEIVER`
* Nilai `'COMPLETED'` adalah anggota dari `batch_state_enum`, bukan `claim_status_enum`. Akibatnya, PostgreSQL melemparkan error:
  `invalid input value for enum claim_status_enum: "COMPLETED"` (HTTP 500).
* Saat mobile memanggil `fetchBatchDetail()`, error HTTP 500 ini tertangkap oleh blok `catch` di [mobile/src/lib/api.ts](src/lib/api.ts) dan memicu peralihan otomatis ke data tiruan (*mock*).

---

### Masalah 2: Batasan Alamat Jaringan Perangkat Mobile (`localhost`)
* Pada HP fisik yang menjalankan Expo Go atau Emulator Android, alamat `http://localhost:4000` merujuk ke antarmuka *loopback* lokal di dalam perangkat HP itu sendiri, bukan ke komputer host yang menjalankan server backend NestJS.
* Hal ini menyebabkan seluruh panggilan `fetch()` dan koneksi Socket.io langsung gagal (*Connection Refused*).

---

### Masalah 3: Ketiadaan Konfigurasi Environment (`.env`)
* Modul mobile belum memiliki file `.env` dan `.env.example`, sehingga variabel `EXPO_PUBLIC_USE_MOCK` dan `EXPO_PUBLIC_API_URL` selalu mengandalkan nilai default *fallback*.

---

## 3. Tahap-Tahap Perbaikan Teknis

### Tahap 1: Koreksi Kueri PostgreSQL di Backend
Perbarui kueri pengecekan hak akses di file [backend/apps/backend/src/modules/batches/batches.service.ts](../backend/apps/backend/src/modules/batches/batches.service.ts):
```typescript
// SEBELUM:
`SELECT id FROM rescue_claims WHERE batch_id = $1 AND receiver_id = $2 AND status IN ('ACTIVE_EN_ROUTE', 'COMPLETED')`

// SESUDAH (DIPERBAIKI):
`SELECT id FROM rescue_claims WHERE batch_id = $1 AND receiver_id = $2 AND status IN ('ACTIVE_EN_ROUTE', 'HANDOVER_COMPLETED')`
```
*Terapkan perubahan dan restart container backend Docker:*
```bash
docker restart sirkula-backend
```

---

### Tahap 2: Implementasi Dynamic Host IP Resolver di Mobile
Buka file [mobile/src/config/env.ts](src/config/env.ts) dan tambahkan resolver dinamis yang mendeteksi IP LAN host secara otomatis via Expo Constants:

```typescript
import Constants from "expo-constants";
import { Platform } from "react-native";
import { z } from "zod";

function resolveApiUrl(rawUrl?: string): string {
  // Jika URL sudah berupa IP publik / remote, gunakan langsung
  if (rawUrl && !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1")) {
    return rawUrl;
  }

  // Jika platform Web, aman menggunakan localhost
  if (Platform.OS === "web") {
    return rawUrl || "http://localhost:4000";
  }

  // Deteksi IP host komputer saat dijalankan di HP fisik via Expo Go
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
      return `http://${hostIp}:4000`;
    }
  }

  // Fallback untuk Android Emulator
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return rawUrl || "http://localhost:4000";
}

const rawApiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL);

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  EXPO_PUBLIC_SOCKET_URL: z.string().url().optional(),
  EXPO_PUBLIC_HMAC_SECRET_KEY: z
    .string()
    .default("sirkula-super-secure-hmac-secret-key-32chars"),
  EXPO_PUBLIC_USE_MOCK: z.string().default("false"),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: rawApiUrl,
  EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL
    ? resolveApiUrl(process.env.EXPO_PUBLIC_SOCKET_URL)
    : rawApiUrl,
  EXPO_PUBLIC_HMAC_SECRET_KEY: process.env.EXPO_PUBLIC_HMAC_SECRET_KEY,
  EXPO_PUBLIC_USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK,
});

if (!parsed.success) {
  const fields = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Konfigurasi environment tidak valid: ${fields}`);
}

export const env = {
  apiUrl: parsed.data.EXPO_PUBLIC_API_URL,
  socketUrl:
    parsed.data.EXPO_PUBLIC_SOCKET_URL ?? parsed.data.EXPO_PUBLIC_API_URL,
  hmacSecretKey: parsed.data.EXPO_PUBLIC_HMAC_SECRET_KEY,
  useMock: parsed.data.EXPO_PUBLIC_USE_MOCK === "true",
} as const;
```

---

### Tahap 3: Pembuatan Konfigurasi `.env` dan `.env.example`
Buat file [mobile/.env](.env) dan [mobile/.env.example](.env.example):
```dotenv
# SIRKULA-AI Mobile Environment Configuration
# ============================================

# Backend API URL (Otomatis diarahkan ke IP LAN komputer saat dibuka via Expo Go)
EXPO_PUBLIC_API_URL=http://localhost:4000

# WebSocket Gateway URL (Socket.io)
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000

# Cryptography HMAC Secret Key (Wajib identik dengan backend)
EXPO_PUBLIC_HMAC_SECRET_KEY=sirkula-super-secure-hmac-secret-key-32chars

# Mode data: false = langsung terhubung ke backend live NestJS
EXPO_PUBLIC_USE_MOCK=false
```

---

### Tahap 4: Sinkronisasi Identitas Aktor Seeder
Aplikasi mobile menggunakan profil aktor yang identik dengan basis data seeding backend:
* **Donatur:** `Sasana Budaya Ganesha (Sabuga)` (`a0000000-0000-0000-0000-000000000001`)
* **Simpul Komunitas Tier 1:** `DKM Masjid Al-Ukhuwah Balai Kota` (`b0000000-0000-0000-0000-000000000001`)
* **Peternak Maggot Tier 2:** `Bio-Larva Maggot BSF Mandiri Cibiru` (`c0000000-0000-0000-0000-000000000001`)

Header yang dikirimkan pada setiap permintaan REST:
```http
x-actor-id: <ACTOR_UUID>
x-actor-role: DONOR | TIER_1_HUB | TIER_2_FARMER
```

---

## 4. Panduan Menjalankan Aplikasi Mobile

### 1. Jalankan di HP Fisik (Android / iOS via Expo Go)
1. Pastikan HP dan komputer terhubung pada **jaringan Wi-Fi yang sama**.
2. Masuk ke direktori mobile dan jalankan Expo dengan cache bersih:
   ```bash
   cd mobile
   pnpm start:clear
   ```
3. Pindai (*scan*) QR code terminal menggunakan aplikasi **Expo Go** (Android) atau Kamera Bawaan (iOS).
4. Resolver dinamis akan otomatis menghubungkan aplikasi ke backend di IP komputer host (`http://<IP_LAN>:4000`).
5. Periksa status bar pada header aplikasi: indikator dot hijau menyala dengan label **"Online"**.

### 2. Jalankan di Emulator Android
1. Buka Android Studio dan nyalakan Android Virtual Device (AVD).
2. Jalankan perintah:
   ```bash
   cd mobile
   pnpm android
   ```
3. Resolver otomatis mengalihkan koneksi ke loopback host emulator `http://10.0.2.2:4000`.

### 3. Jalankan di Browser (Web View)
Untuk pengujian cepat antarmuka mobile di komputer tanpa emulator:
```bash
cd mobile
pnpm web
```

---

## 5. Hasil Pengujian & Verifikasi

1. **TypeScript Typecheck:**
   ```bash
   pnpm typecheck
   # Output: 0 error, kompilasi lolos 100%
   ```
2. **Postman Automated Integration Suite (Newman):**
   * Total Endpoint: 11 request
   * Total Asersi: 19 assertions
   * Hasil: **19/19 lolos (100% PASS)**
3. **Endpoint Detail Batch (`GET /api/v1/batches/:id`):**
   * Status: `200 OK` (bebas dari error enum PostgreSQL).
4. **Alur Transaksi Lapangan:**
   * Donatur mengambil foto $\rightarrow$ Gemini AI mengekstrak menu $\rightarrow$ Batch terdaftar di backend $\rightarrow$ Simpul Tier 1 menerima broadcast WebSocket $\rightarrow$ Scan QR menyelesaikan serah terima dan menerbitkan Sertifikat *Digital Liability Waiver*.
