# Rencana Transformasi SIRKULA-AI

## Tujuan

Ubah demo web yang ada menjadi prototipe responsif penyelamatan makanan berlebih. Pertahankan runtime vanilla JavaScript dan server Node bawaan; tandai layanan yang belum terhubung sebagai simulasi.

## Audit repositori

- `index.html` memuat `src/main.js` dan `src/styles.css`.
- `src/main.js` mengikat navigasi, formulir, dan aksi.
- `src/router.js` memilih halaman berdasarkan URL.
- `src/views.js` merender halaman publik dan dashboard.
- `src/store.js` menyimpan state demo browser.
- `src/data.js` memasok data awal.
- `server.cjs` menyajikan SPA statis.
- `scripts/check.js` dan `scripts/smoke.mjs` memeriksa aplikasi.
- `context/schema.sql` mendeskripsikan skema target PostgreSQL/PostGIS; belum dihubungkan ke runtime.
- Tidak ada framework, backend, penyimpanan objek, API AI/cuaca, Socket.io, scanner QR, atau proyek Expo di repositori.

Graph dependency dipetakan dari import dan entry point karena skill/tool Graphify tidak terpasang.

## Cakupan implementasi

1. Ganti semua identitas, konten, dan data material menjadi penyelamatan makanan.
2. Bangun landing page dengan identitas SIRKULA-AI, alur tiga tier, FAQ, AI demo, dan metrik simulasi.
3. Sediakan login/register demo dan enam role sesuai akses yang tercatat pada akun.
4. Bangun dashboard berbeda untuk DONOR, TIER_1_HUB, TIER_2_FARMER, TIER_3_COMPOST, ESG_AUDITOR, dan SIMULATOR_ADMIN.
5. Implementasikan batch demo: foto, koreksi hasil vision simulasi, klaim, token serah-terima demo, penyelesaian, histori, audit log, dan transisi tier oleh simulator.
6. Terapkan privasi lokasi, konfirmasi tindakan, validasi formulir, empty/error/success state, akses keyboard, dan reflow mobile.
7. Selaraskan dokumentasi dan checker dengan batas implementasi aktual serta catatan keselamatan pangan.

## Batasan yang disengaja

- Tidak membuat akun autentikasi produksi atau menyimpan kata sandi.
- Tidak menyebut mock vision sebagai AI terintegrasi atau penentu keamanan pangan.
- Tidak membuat QR palsu; handover memakai kode demo yang dapat diverifikasi di alur lokal.
- Tidak mengklaim peta, cuaca, geospasial, notifikasi, analitik, sertifikat, maupun WebSocket sebagai data/layanan nyata.
- Tidak membangun APK atau mengganti arsitektur dengan monorepo yang belum tersedia.
- Tidak memakai estimasi Q10 sebagai keputusan kelayakan konsumsi/pakan.

## Peta route

- Publik: `/`, `/login`, `/register`, `/select-role`.
- Operasional: `/dashboard`, `/dashboard/food-batches`, `/dashboard/donors`, `/dashboard/receivers`, `/dashboard/analytics`.
- Pendukung: `/legal-vault`, `/simulation`, `/profile`, `/missions`, `/batches/new`, `/batches/:id`.

## Kriteria verifikasi

- `npm run check`: validasi state machine, akses role, rute, sumber, dan aset tanpa dependensi baru.
- `npm run smoke`: jalankan server lokal, buka route publik/role penting, pastikan HTML dan aset dilayani.
- Audit pencarian: istilah lama marketplace material tidak muncul di aplikasi maupun dokumen produk.
- Periksa ukuran ponsel, tablet, dan desktop; pastikan tidak ada tabel/menu yang memaksa overflow.

## Status

- [x] Audit dokumen, schema, struktur, dan dependensi aktual.
- [x] Revisi dokumen konteks agar konsisten dengan keselamatan pangan dan arsitektur aktual.
- [x] Ganti data dan store ke model batch penyelamatan makanan.
- [x] Implementasikan halaman, role, interaksi, serta gaya responsif.
- [x] Perbarui pemeriksaan dan verifikasi lokal.
