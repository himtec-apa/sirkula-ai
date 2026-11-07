# Rencana Perbaikan Autentikasi PostgreSQL, Volume Upload Foto Docker, dan Sinkronisasi Mobile SIRKULA-AI

## Global Constraints
- Monorepo structure: `backend` (NestJS 11 + Express + PostgreSQL + Redis), `mobile` (React Native Expo 52), `docker-compose.yml`.
- Database: PostgreSQL with PostGIS on `sirkula_db`, user `postgres`.
- Autentikasi: Single-source-of-truth adalah tabel `actors` di PostgreSQL via JWT Bearer Token. Sesi client di mobile harus murni mencerminkan `currentActor` hasil autentikasi database, bukan fallback seeder donor `a0000000-0000-0000-0000-000000000001` atau cached `profiles[role]`.
- Upload Foto: Seluruh file upload foto dari mobile harus disimpan ke disk lokal di folder upload (`./uploads` mounted ke `/app/uploads` di container backend) dan dapat diakses publik melalui URL HTTP statis (`http://<host>:4000/uploads/<filename>`).
- Mockup: Hilangkan seluruh fallback ke mockup lokal. Data wajib mengalir langsung dari API backend dan database PostgreSQL.

## Task 1: Docker Volume Mount & Backend Uploads Static Serving Configuration
- Files:
  - `../docker-compose.yml`
  - `../backend/apps/backend/src/main.ts`
  - `../backend/apps/backend/src/config/env.ts`
- Requirements:
  1. Di `docker-compose.yml`, tambahkan volume mount `./uploads:/app/uploads` dan environment variable `UPLOAD_DIR=/app/uploads` pada service `backend`.
  2. Buat folder `uploads` di root monorepo `../uploads` jika belum ada.
  3. Di `backend/apps/backend/src/config/env.ts`, tambahkan konfigurasi `UPLOAD_DIR` (default `./uploads`) dan `UPLOAD_BASE_URL` (default `http://localhost:4000/uploads` atau dinamis dari host).
  4. Di `backend/apps/backend/src/main.ts`, gunakan Express static file serving untuk mengekspos folder `uploads` pada rute `/uploads`:
     ```typescript
     import express from 'express';
     import * as path from 'path';
     // ...
     const uploadDir = env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
     app.use('/uploads', express.static(uploadDir));
     ```
  5. Pastikan endpoint `http://127.0.0.1:4000/uploads/` dapat diakses dan menyajikan file statis.

## Task 2: Backend Batches Service Disk Persistence for Uploaded Food Images
- Files:
  - `../backend/apps/backend/src/modules/batches/batches.service.ts`
- Requirements:
  1. Di `batches.service.ts`, import `fs` (`import * as fs from 'fs/promises';`) dan `path`.
  2. Saat `file` diterima di method `analyzeAndCreateBatch(donorId, dto, file)`:
     - Buat direktori upload jika belum ada (`await fs.mkdir(uploadDir, { recursive: true });`).
     - Tulis buffer gambar ke disk dengan nama unik: `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname) || '.jpg'}`.
     - Simpan URL lengkap yang valid ke `imageUrl`: `${uploadBaseUrl}/${filename}` (bukan lagi dummy mock `https://storage.sirkula.local/...`).
  3. Pastikan `imageUrl` yang disimpan di kolom `image_url` tabel `food_batches` adalah URL nyata yang dapat diakses oleh client mobile maupun web.

## Task 3: Mobile Actor Store Single-Source-of-Truth & Session Reset Fix
- Files:
  - `src/store/useActorStore.ts`
  - `src/lib/api.ts`
- Requirements:
  1. Di `src/store/useActorStore.ts`:
     - Perbaiki fungsi `useActorHeaders`: pastikan selalu memprioritaskan `currentActor.id`, `activeRole`, dan menyertakan header `Authorization: Bearer ${token}` secara konsisten.
     - Perbaiki fungsi `logout()`: jangan hanya mengosongkan `token` dan `currentActor`, tetapi juga reset `profiles: createInitialProfiles()` dan `activeRole: ActorRole.DONOR` sehingga residu akun lama (seperti akun `donor@example.com`) dibersihkan total dari AsyncStorage.
     - Pastikan `setAuthSession({ token, actor })` mengikat `currentActor: actor`, `activeRole: actor.role`, dan memperbarui `profiles[actor.role]: actor`.
  2. Di `src/lib/api.ts`:
     - Di fungsi `loginActorApi(identifier, password)`: panggil langsung `POST /api/v1/auth/login`. Jika gagal (misal 404/401), lempar error pesan asli dari backend ("Akun tidak ditemukan atau kata sandi salah"), jangan diam-diam menimpa atau fallback ke ID default donor.

## Task 4: Mobile Screen CurrentActor Binding across all Role Dashboards & Camera Screen
- Files:
  - `src/app/(donor)/index.tsx`
  - `src/app/(donor)/camera.tsx`
  - `src/app/(tier1-hub)/index.tsx`
  - `src/app/(tier1-hub)/hub-scanner.tsx`
  - `src/app/(tier1-hub)/mission/[id].tsx`
  - `src/app/(tier2-farmer)/index.tsx`
  - `src/app/(tier3-compost)/index.tsx`
  - `src/app/(esg-auditor)/index.tsx`
  - `src/app/(simulator-admin)/index.tsx`
  - `src/components/ui/AppHeader.tsx`
- Requirements:
  1. Ganti semua pengambilan aktor yang langsung membaca `profiles[ActorRole.X]` dengan memprioritaskan `currentActor`:
     ```typescript
     const currentActor = useActorStore((state) => state.currentActor);
     const profileActor = useActorStore((state) => state.profiles[ROLE]);
     const actor = currentActor ?? profileActor;
     ```
  2. Di `src/app/(donor)/camera.tsx`:
     - Gunakan ID aktor yang sedang aktif (`currentActor?.id ?? donor.id`) saat mengirim `actorHeaders` ke `analyzeAndCreate`.
     - Pastikan `analyzeAndCreate` mengirim `multipart/form-data` lengkap dengan token autentikasi sehingga backend tidak menolak request atau mendeteksi sebagai aktor anonim.
  3. Di `src/components/ui/AppHeader.tsx`:
     - Pastikan nama dan peran yang tampil di header atas adalah data asli dari `currentActor` akun yang sedang login.

## Task 5: Mobile Layout Route Guards & API Bearer Auth Ingestion Verification
- Files:
  - `src/app/_layout.tsx`
  - `src/app/index.tsx`
  - `src/lib/api.ts`
- Requirements:
  1. Di `src/app/_layout.tsx`:
     - Tambahkan proteksi rute: jika `hasHydrated` dan `!isAuthenticated`, tetapi pengguna berada di rute privat (misal segmen diawali `(donor)`, `(tier1-hub)`, `(tier2-farmer)`, `(tier3-compost)`, `(esg-auditor)`, `(simulator-admin)`), otomatis arahkan kembali ke `/login`.
     - Jika pengguna sudah `isAuthenticated` dan berada di rute `/login` atau `/register`, arahkan ke `ROLE_HOME_ROUTE[activeRole]`.
  2. Di `src/app/index.tsx` (SplashScreen):
     - Pastikan jika `isAuthenticated` dan `currentActor` ada, baru arahkan ke `ROLE_HOME_ROUTE[currentActor.role]`. Jika tidak valid, arahkan ke `/login`.
  3. Uji coba end-to-end:
     - Login dengan berbagai peran akun dari database (Donatur, Hub, Peternak, Komposter, Auditor, Admin).
     - Verifikasi tidak ada fallback liar ke `donor@example.com`.
     - Verifikasi upload foto di mobile menghasilkan file gambar asli di folder `uploads` backend dan tersimpan ke PostgreSQL.
