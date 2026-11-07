# Aturan Pengembangan SIRKULA-AI

## Produk
SIRKULA-AI menyelamatkan makanan sisa atau berlebih yang masih layak disalurkan. Platform menghubungkan penyedia makanan, simpul komunitas, peternak/pengelola pakan, dan pengelola kompos. Prioritas pertama adalah distribusi aman dan bermartabat untuk manusia.

Jangan gunakan konsep marketplace material, bahan baku industri, atau bank sampah umum. Tidak semua batch cocok untuk pakan/kompos. Nama resmi produk selalu **SIRKULA-AI**. Tagline: **Selamatkan Pangan, Sebarkan Kebaikan.**

## Arsitektur aktual
Repo adalah SPA vanilla JavaScript tanpa framework, dengan server HTTP Node bawaan dan penyimpanan demo browser. Lihat ARCHITECTURE.md. Dokumen target tentang Next.js, NestJS, Expo, PostgreSQL, Redis, dan penyedia AI tidak berarti integrasi itu tersedia.

Pertahankan struktur dan dependensi minimal. Jangan menambah dependency atau mengganti stack sebelum fitur tidak dapat diselesaikan dengan API browser/Node yang tersedia.

## Aturan kode
- Gunakan JavaScript module, nama konsisten, early return, dan fungsi kecil dengan satu tugas.
- Validasi input sebelum mengubah state.
- Simpan hanya data demo non-sensitif. Jangan menyimpan password, token autentikasi, alamat privat, atau kunci rahasia di localStorage.
- Pisahkan layanan simulasi dari state dan tampilan. Beri label demo pada hasil/aksi.
- Pakai state batch sesuai PRD dan schema.sql. Catat perubahan status di audit log demo.
- Akses role dibatasi pada role profil aktif. Jangan membuka auditor/admin lewat role switch biasa.
- Jangan membuat komentar placeholder, fungsi kosong, atau klaim integrasi palsu.
- Jangan mengubah skema database tanpa memeriksa pemakainya. Saat ini SQL adalah kontrak target, belum dipakai aplikasi.

## Keselamatan dan privasi
- Computer Vision hanya memberi saran kategori, nama, dan taksiran visual; pengguna dapat mengoreksi.
- Foto tidak membuktikan keamanan pangan, kontaminasi, bakteri, atau kecocokan pakan.
- Jangan menyebut timer Q10 sebagai masa aman tersertifikasi. Tampilkan sebagai estimator eksperimental dengan asumsi dan validasi manusia.
- Batch Tier 2/3 hanya boleh dibuka setelah kesesuaian diperiksa pihak berwenang.
- Sembunyikan alamat presisi sebelum klaim disetujui. Hindari identitas penerima manfaat pada halaman publik.
- Bukti serah-terima adalah catatan operasional, bukan pembebasan tanggung jawab hukum.

## UI dan aksesibilitas
- Ikuti DESIGN.md sebagai sumber token dan tata letak.
- Gunakan HTML semantik, label input nyata, status tekstual, fokus keyboard terlihat, dan dialog yang dapat ditutup dengan Escape.
- Semua aksi harus bekerja dan memberi umpan balik. Sediakan state kosong, error, loading, dan sukses sesuai kebutuhan.
- Mobile-first: target sentuh minimal 44px, tanpa overflow horizontal, navigasi mudah dijangkau, hormati prefers-reduced-motion.
- Jangan gunakan emoji sebagai ikon UI.

## Perintah lokal
- npm run dev
- npm run check
- npm run smoke

Pemeriksaan build/smoke diminta pengguna. Belum ada konfigurasi lint atau typecheck.
