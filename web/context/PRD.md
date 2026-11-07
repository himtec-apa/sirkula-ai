# Product Requirements Document — SIRKULA-AI

## 1. Identitas dan tujuan
Nama: **SIRKULA-AI**. Judul resmi: **Pengembangan Ekosistem Digital Penyelamatan Pangan Berlebih Berbasis Artificial Intelligence untuk Optimalisasi Distribusi Pangan kepada Masyarakat yang Membutuhkan**. Tagline: **Selamatkan Pangan, Sebarkan Kebaikan.**

SIRKULA-AI menghubungkan usaha kuliner yang memiliki makanan sisa atau berlebih dan masih layak disalurkan dengan simpul komunitas serta pengelola pemanfaatan organik. Prioritas pertama adalah penyaluran kepada manusia secara aman, bermartabat, dan sesuai pemeriksaan operasional.

Computer Vision membantu mengusulkan nama/kategori dari foto. Foto tidak dapat membuktikan keamanan pangan, kontaminasi, atau kecocokan pakan. Sistem tidak menggantikan pemeriksaan manusia.

## 2. Tingkatan pemanfaatan
1. **Tier 1 — manusia:** individu, keluarga, yayasan, panti, rumah singgah, asrama, komunitas dan simpul terverifikasi mengklaim batch setelah informasi operasional diperiksa.
2. **Tier 2 — pakan:** peternak BSF, lele, unggas atau pengolah pakan menerima batch hanya setelah jenis, kondisi, dan penanganan dinilai sesuai.
3. **Tier 3 — kompos:** komunitas kompos/pengelola organik menerima bahan hanya jika sesuai. Batch yang tidak sesuai tidak otomatis aman untuk jalur ini.

Perpindahan tier bukan keputusan AI, cuaca, suhu, atau timer. Parameter hanya membantu peninjauan.

## 3. Peran dan hak akses
| Role | Pengguna | Hak utama |
| --- | --- | --- |
| DONOR | Restoran, katering, warung, bakery, hotel, acara | Buat/kelola batch, koreksi saran AI, lihat klaim, konfirmasi serah-terima, histori dan dampak |
| TIER_1_HUB | Simpul komunitas terverifikasi | Lihat radar umum, klaim Tier 1, akses detail jemput setelah klaim, konfirmasi misi |
| TIER_2_FARMER | Peternak/pengelola pakan | Lihat batch yang telah dinilai sesuai, klaim, jemput, histori |
| TIER_3_COMPOST | Komunitas kompos/pengelola organik | Lihat batch yang dinilai sesuai, jadwalkan pengambilan, histori |
| ESG_AUDITOR | CSR/DLH/auditor program | Lihat metrik agregat, aktivitas, histori batch, peta umum, dokumen pencatatan |
| SIMULATOR_ADMIN | Admin demo/juri berwenang | Kelola simulasi, ubah parameter demo, picu transisi uji, lihat log |

Akun hanya boleh mengaktifkan role yang dimilikinya. Auditor/admin perlu akses khusus. Data penerima manfaat tidak dipublikasikan.

## 4. Batch dan state machine
State mengikuti enum `schema.sql`: TIER_1_HUMAN_ACTIVE, TIER_1_CLAIMED, TIER_2_ANIMAL_ACTIVE, TIER_2_CLAIMED, TIER_3_COMPOST_ACTIVE, COMPLETED, CANCELLED_BY_DONOR. Klaim Tier 3 dicatat pada rescue claim; tidak menambah status batch baru.

Klaim hanya dapat dibuat untuk batch aktif pada tier sesuai. Serah-terima selesai setelah token/pemeriksaan yang berlaku dikonfirmasi. Batch kedaluwarsa atau diklaim tidak dapat diklaim ulang. Transisi antar-tier memerlukan keputusan/pemeriksaan tercatat. Transisi demo hanya dapat dipicu SIMULATOR_ADMIN dan selalu berlabel SIMULATION. Pembatalan tidak menghapus audit.

## 5. Kebutuhan donor
- Ringkasan batch aktif, klaim, porsi tercatat, dan histori.
- Form batch: foto, nama/kategori, porsi, berat, waktu produksi, waktu paparan, kondisi simpan, batas distribusi, alergen/bahan diketahui, catatan, lokasi.
- Vision menyarankan nama/kategori/taksiran; donor meninjau dan dapat mengoreksi. Confidence bukan penilaian keamanan.
- Tampilkan data operasional yang belum lengkap. Jangan menyebut kesimpulan AI sebagai aman.
- Donor mengonfirmasi token serah-terima/QR/API bila layanan tersedia.
- Histori dan dampak membedakan distribusi manusia, pakan, dan kompos.

## 6. Kebutuhan penerima
- Radar berdasarkan kategori, waktu, jumlah dan wilayah umum.
- Alamat rinci hanya tersedia bagi penerima yang berhasil klaim.
- Tier 1 tidak mengekspos identitas penerima akhir.
- Tier 2 menampilkan berat, karakteristik dan pemeriksaan kesesuaian dari manusia.
- Tier 3 menampilkan berat, jenis, jadwal, status pengambilan.
- Misi, token demo, dan histori mengikuti role.

## 7. Command Center, audit, simulator
Dashboard auditor/admin menampilkan jumlah batch, porsi, berat, status, kategori, aktivitas dan log. Peta tanpa Mapbox hanya menunjukkan area umum berlabel SIMULASI.

Legal Vault berisi bukti pencatatan/serah-terima. Dokumen bukan jaminan pembebasan tanggung jawab dan tidak menggantikan kepatuhan hukum/keamanan pangan. Nama kolom `waiver_*` pada schema dipertahankan demi kompatibilitas dokumen target, bukan sebagai pembebasan tanggung jawab.

Simulator dapat memilih batch demo, mengubah parameter waktu/suhu untuk uji, melihat log, dan mencoba transisi. Simulator tidak mengubah data produksi. Semua efek diberi label SIMULATION.

## 8. AI, waktu, keselamatan
- Output AI: nama/kategori disarankan, taksiran porsi/berat bila tersedia, confidence.
- Jika model tidak yakin, pengguna memilih atau mengoreksi kategori manual.
- AI tidak menyatakan makanan aman, bebas patogen/alergen, layak pakan, atau menggantikan pemeriksaan.
- Waktu, suhu, penyimpanan, bahan dan batas penyaluran adalah data operasional manusia.
- Rumus Q10, bila dipertahankan, hanya estimator eksperimental: tampilkan asumsi dan input; jangan jadikan sertifikasi masa aman atau pemicu otomatis tier.
- Ketidakpastian mengunci klaim Tier 1 sampai peninjauan manusia.

## 9. Prototipe repository saat ini
Web lokal mendukung landing, login/register simulasi, pemilihan role, dashboard role, batch demo, preview foto, koreksi saran Vision demo, klaim lokal, kode handover demo, audit lokal, dampak simulasi, legal vault informatif, simulator admin, dan layout responsif.

Mock dipisahkan dari tampilan. Password tidak disimpan.

## 10. Integrasi target dan batasnya
schema.sql memetakan PostgreSQL/PostGIS dan tabel actors, food_batches, batch_items, rescue_claims, ESG telemetry, audit logs. Skema belum terhubung ke app.

Gemini, cuaca, Mapbox/PostGIS, WebSocket, notifikasi, QR/HMAC, PDF, Expo dan APK memerlukan implementasi/kredensial yang belum tersedia. Environment key tidak ditanam di frontend. Endpoint/event dalam dokumen adalah kontrak mendatang, bukan endpoint aktif.

## 11. Metrik dan data
Porsi, berat, donor, komunitas, emisi, dan nilai ekonomi harus berasal dari data terukur dengan metodologi tertulis. Sampai integrasi tersedia, beri label **DATA SIMULASI**. Target bukan capaian. Rumus emisi SQL perlu validasi sebelum laporan eksternal.

## 12. Kriteria penerimaan prototipe
1. Tidak ada istilah atau visual marketplace material.
2. Enam role mendapat navigasi/akses sesuai akun.
3. Pengguna dapat membuat batch, mengoreksi saran, klaim batch sesuai, dan menyelesaikan handover demo.
4. Perubahan state masuk audit dan batch nonaktif tak dapat diklaim.
5. Simulator terbatas pada data demo dan role admin.
6. Privasi lokasi dan martabat penerima terjaga.
7. Tidak ada klaim AI/timer tentang keamanan pangan.
8. Route, formulir, aset, state machine, pemeriksaan lokal, dan layout responsif berjalan.
