# SIRKULA-AI — Design System

## Arah visual
Eco-Tech hangat dan human-centered untuk penyelamatan pangan Indonesia. Tampilkan makanan siap santap, staf katering, relawan, serah terima, peternak, dan kompos secara terpisah. Jaga martabat penerima dan privasi lokasi.

Gunakan foto dokumenter natural untuk menunjukkan kegiatan, bukan dekorasi stok generik. Landing dan pengalaman lapangan memakai Light Mode. Command Center ESG/simulator memakai Dark Mode. Gunakan ruang putih, teal, dan amber hanya untuk peringatan; hindari tampilan katalog e-commerce.

Hindari visual bahan industri, tumpukan sampah sebagai hero, makanan rusak dalam feed Tier 1, foto penerima yang mengekspos identitas, dan animasi yang mengganggu.

## Token Light
| Token | Nilai |
| --- | --- |
| Primary 500 | #0B7A6B |
| Primary 600 | #085E52 |
| Secondary 500 | #0FA690 |
| Accent | #F59E0B |
| Background | #F5FAF9 |
| Surface | #FFFFFF |
| Border | #E6F7F4 |
| Text primary | #0F172A |
| Text muted | #64748B |
| Success | #10B981 |
| Warning | #F59E0B |
| Error | #EF4444 |
| Info | #3B82F6 |

## Token Dark Command Center
| Token | Nilai |
| --- | --- |
| Background | #0F172A |
| Surface | #1E293B |
| Primary | #0E9F8B |
| Secondary | #12C4AA |
| Border | #334155 |
| Text primary | #F8FAFC |
| Text muted | #94A3B8 |
| Success | #34D399 |
| Warning | #FBBF24 |
| Error | #F87171 |
| Info | #60A5FA |

## Tipografi dan bentuk
- Font: Plus Jakarta Sans.
- H1: 32px desktop / 28px mobile, weight 700.
- H2: 24px / 20px, weight 600.
- H3: 18px / 16px, weight 600.
- Body: 14px; caption: 12px; tombol: 14px, 600.
- Jarak mengikuti kelipatan 4px dan 8px.
- Container maksimum 1440px, padding fluid.
- Card radius 12px; input 8px; shadow ringan.
- Gunakan SVG inline yang konsisten dan diberi nama aksesibel.

## Tata letak
- Landing: navbar sticky, hero editorial dua kolom, preview batch simulasi, penjelasan AI, timeline, dampak, FAQ, CTA, footer.
- Dashboard: sidebar desktop, header, konten gelap dengan peta skematik, statistik, batch, audit log dan simulator.
- Ponsel: satu kolom, navigasi bawah empat tujuan per role, kontrol lebar penuh, dialog yang muat viewport.
- Tablet: dua kolom hanya ketika konten terbaca; tabel memakai scroll lokal.
- Peta tanpa Mapbox adalah ilustrasi lokasi kasar berlabel SIMULASI, tanpa alamat presisi.

## Komponen dan state
Button, input, card, status batch, toast, dialog, kartu batch, navigasi, badge simulasi, audit row, serta empty/loading/error/success state memakai token yang sama.

Status selalu punya label teks:
- Tier 1: hijau, klaim untuk distribusi manusia.
- Tier 2: amber, pemanfaatan pakan; perlu pemeriksaan.
- Tier 3: merah lembut, evaluasi pengelolaan organik.
- Selesai: biru/teal, serah-terima tercatat.
- Batal: netral, dibatalkan.

## Responsif dan aksesibilitas
- Breakpoint mobile hingga 639px, tablet 640–1023px, desktop 1024px+.
- Tidak ada scroll horizontal halaman.
- Kontrol sentuh minimal 44px dengan jarak cukup.
- Label terlihat pada input; error terhubung ke field.
- Fokus :focus-visible jelas; dialog berlabel, fokus terkelola, ditutup Escape.
- Semua aksi dapat digunakan keyboard; hormati prefers-reduced-motion.
- Kontras teks WCAG AA dan zoom teks 200%.

## Visual lokal
assets/food-rescue-scenes.png adalah contact sheet demo 2×2 yang di-crop untuk aktivitas donor, komunitas, makanan siap santap, dan kompos. assets/tier2-farmer.png menampilkan aktivitas peternak BSF. Semua batch contoh berlabel DATA SIMULASI.