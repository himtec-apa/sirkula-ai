# Arsitektur SIRKULA-AI

## Kondisi repository
Implementasi aktif adalah prototipe web lokal, bukan monorepo multi-platform.

| Bagian | Implementasi |
| --- | --- |
| Halaman | HTML semantik |
| UI | CSS responsif |
| Aplikasi | JavaScript ES modules tanpa framework |
| Server lokal | Node.js HTTP bawaan, server.cjs |
| Data demo | src/data.js dan src/store.js, localStorage |
| Pemeriksaan | Skrip Node, scripts/check.js dan scripts/smoke.mjs |

Belum tersedia backend, database runtime, autentikasi server, peta geospasial, layanan AI/cuaca, object storage, WebSocket, notifikasi push, scanner/generator QR, PDF service, Expo, atau APK. Mock diberi label simulasi.

## Peta dependensi file
- server.cjs menyajikan index.html.
- index.html memuat src/main.js dan src/styles.css.
- src/main.js mengikat aksi/form dan memakai router, views, store, services.
- src/router.js menjaga URL/history dan memilih halaman.
- src/views.js merender halaman.
- src/store.js memvalidasi dan mengubah state; memakai data.js.
- src/services.js menampung saran Vision dan token handover demo.
- src/data.js menjadi sumber data simulasi.
- scripts/check.js memeriksa kontrak store, role, transisi, route dan aset.
- scripts/smoke.mjs menjalankan server lokal dan memeriksa respons route.

Graph dependency dipetakan dari import dan entry point karena skill/tool Graphify tidak terpasang.

## Navigasi dan akses
Route publik: /, /login, /register, /select-role.
Operasional: /dashboard, /dashboard/food-batches, /dashboard/donors, /dashboard/receivers, /dashboard/analytics, /legal-vault, /simulation, /profile, /missions, /batches/new, /batches/:id.

Dashboard menyesuaikan role: DONOR, TIER_1_HUB, TIER_2_FARMER, TIER_3_COMPOST, ESG_AUDITOR, SIMULATOR_ADMIN. Akses ini hanya simulasi browser, bukan kontrol akses produksi. Auditor/admin tidak tersedia melalui role switch untuk akun tanpa role itu.

## Alur data demo
1. Halaman membaca state dari store.
2. Formulir divalidasi di sisi klien.
3. Store melakukan transisi batch dan menambahkan audit log lokal.
4. Event sirkula:statechange merender ulang halaman.
5. Browser menyimpan data simulasi non-sensitif agar demo bertahan setelah reload.

Data tidak disinkronkan antarperangkat. Token lokal bukan HMAC/QR terenkripsi.

## Model batch
State mengikuti enum di schema.sql. Klaim hanya dapat dibuat untuk batch aktif pada tier sesuai. Transisi antar-tier memerlukan pemeriksaan dan keputusan yang tercatat. Simulator hanya dapat mengubah data demo. Timer atau suhu tidak menentukan keamanan pangan/pakan.

## Database target
schema.sql memetakan PostgreSQL 16/PostGIS dan tabel actors, food_batches, batch_items, rescue_claims, esg_telemetry_logs, batch_state_audit_logs. Skema belum terhubung ke app; jangan menyebutnya database aktif. Rumus telemetry adalah asumsi yang perlu validasi metodologi.

## Batas integrasi berikutnya
Jika backend ditambahkan, API tervalidasi menjadi sumber kebenaran role, claim, geospasial, state machine, audit, dan sinkronisasi. Pindahkan mock services ke adaptor API setelah endpoint, autentikasi, dan kebijakan keselamatan tersedia. Kunci API hanya berada di server melalui environment variables.

APK memerlukan proyek native dan toolchain Android yang belum tersedia. Web tetap mobile-first dan dapat dibuka di browser ponsel.