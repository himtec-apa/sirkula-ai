# SIRKULA-AI: Mobile Application (React Native & Expo)

Aplikasi mobile berbasis Expo Router v4 dengan antarmuka berbasis peran (Role-Based Routing) untuk Donor, Simpul Komunitas, Peternak Pakan, Bank Kompos, Auditor ESG, dan Admin.

---

## 1. Tech Stack

- **Runtime & Framework**: React Native 0.76.9 + Expo SDK 52
- **Routing**: Expo Router v4 (Typed File-based routing)
- **State & Caching**: TanStack React Query v5 + Zustand v5
- **Styling**: NativeWind v4 (Tailwind CSS)
- **Real-Time Synchronization**: Socket.io Client (`useSocketSync`)
- **Perangkat Keras**: Expo Camera, Image Picker, Location, Haptics, Barcode/QR Scanner

---

## 2. Struktur Proyek Mobile

```
mobile/
├── assets/                     # Logo, icon, adaptive-icon, splash screen
├── src/
│   ├── app/                    # File-based routing
│   │   ├── (donor)/            # Layar Donor: Camera AI, Batch Post, QR Handover, Riwayat
│   │   ├── (tier1-hub)/        # Layar Simpul Manusia: Radar Pangan, Detail Misi
│   │   ├── (tier2-farmer)/     # Layar Peternak Maggot/Lele: Feed Claim, Konversi
│   │   ├── (tier3-compost)/    # Layar Bank Sampah: Biomassa, Degradasi Kompos
│   │   ├── (esg-auditor)/      # Layar Auditor: Jejak Karbon & Metana
│   │   ├── (simulator-admin)/  # Layar Admin: Pengaturan Simulasi Time-Warp
│   │   ├── login.tsx           # Halaman Masuk Terpadu
│   │   └── _layout.tsx         # Root Layout, QueryClient, Socket Provider
│   ├── components/
│   │   └── ui/
│   │       ├── AppHeader.tsx   # Header profil tunggal (tanpa selector dummy)
│   │       └── ...             # Kartu batch, radar badge, metric widgets
│   ├── hooks/
│   │   ├── useSocketSync.ts    # Sinkronisasi instan cache React Query via WebSocket
│   │   └── useActorStore.ts    # Manajemen token JWT & profil aktor
│   ├── lib/
│   │   ├── api.ts              # Fetch client ke backend NestJS (fetchNearbyBatches 50km)
│   │   ├── bio-thermal-sdk.ts  # Fallback lokal kalkulasi Arrhenius & ESG
│   │   └── esg-converter.ts    # Konversi bobot pangan ke emisi CO2 & CH4
│   └── types/                  # Definisi tipe TypeScript
├── app.json                    # Konfigurasi nama aplikasi, bundle ID, logo
├── metro.config.js             # Resolusi module internal & Web AssetRegistry
└── package.json
```

---

## 3. Fitur Utama

1. **Pemindaian AI Multimodal (`camera.tsx`)**:
   - Memindai foto prasmanan atau hidangan tunggal langsung melalui kamera atau galeri.
   - Mengirim citra ke backend AI Vision (`9router`/Gemini).
   - Mendeteksi estimasi porsi, berat (kg), kategori risiko pangan, dan batas waktu aman konsumsi manusia.
2. **Persistensi Batch Donatur Antar-Sesi**:
   - Batch yang didonasikan tersimpan di basis data PostgreSQL backend dan di-query ulang menggunakan radius metropolitan Bandung (50 km) serta identitas aktor Donatur (`x-actor-id`).
   - Saat Donatur logout lalu login kembali, batch tetap tampil di daftar aktif `(donor)/index.tsx` atau riwayat `(donor)/history.tsx`.
3. **Navigasi Tab Responsif**:
   - Tab navigasi bawah menggunakan `tabBarIcon` dan `tabBarLabelStyle` bawaan React Navigation yang secara otomatis menyesuaikan layar ramping tanpa tumpang tindih (*clipping*).
4. **Header Profil Tunggal (`AppHeader.tsx`)**:
   - Menampilkan hanya identitas akun yang sedang aktif (nama entitas, role pill, live status indicator, dan tombol keluar).
5. **Sinkronisasi WebSocket Instan**:
   - Saat Donor menerbitkan batch baru, tab Radar pada akun Simpul Komunitas langsung terbarui tanpa perlu refresh manual.
6. **Verifikasi QR & Handover Kriptografis**:
   - Kode QR di-generate menggunakan kunci HMAC dan diverifikasi secara langsung ke server untuk mencegah klaim ganda.

---

## 4. Konfigurasi Lingkungan (`mobile/.env`)

File konfigurasi terletak di `mobile/.env`:

```env
# URL Backend NestJS (Gunakan IP LAN jika menjalankan di smartphone fisik)
EXPO_PUBLIC_API_URL=http://localhost:4000

# URL Gateway WebSocket
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000

# Kunci rahasia HMAC (Wajib identik dengan konfigurasi backend)
EXPO_PUBLIC_HMAC_SECRET_KEY=sirkula-super-secure-hmac-secret-key-32chars

# Nonaktifkan mode tiruan (Gunakan database & backend riil)
EXPO_PUBLIC_USE_MOCK=false
```

> **Tips Pengujian HP Fisik**: Ganti `localhost` dengan IP lokal laptop/komputer Anda (misal `http://192.168.1.15:4000`).

---

## 5. Cara Menjalankan Aplikasi

```bash
cd mobile

# 1. Install dependencies
pnpm install

# 2. Jalankan Expo Metro Bundler dengan pembersihan cache
npx expo start -c

# 3. Opsi Pengujian:
# - Tekan 'a' untuk Android Emulator
# - Tekan 'w' untuk menjalankan di Browser Web
# - Buka Expo Go di Smartphone Android/iOS dan scan QR code di terminal
```
