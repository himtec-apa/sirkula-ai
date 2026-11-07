import { CATEGORY_OPTIONS, FOOD_CATEGORY_OPTIONS, ROLES } from "./data.js";
import { getCurrentActor, UUID_ALIAS_MAP } from "./store.js";
import { routeHref } from "./router.js";

const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
}[char]));

const money = (value) => new Intl.NumberFormat("id-ID").format(Number(value) || 0);
const dateTime = (value) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Belum dicatat";
const shortDate = (value) => value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(value)) : "—";
const localInputDate = (offsetHours) => {
  const date = new Date(Date.now() + offsetHours * 3600000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const stateLabels = {
  TIER_1_HUMAN_ACTIVE: "Tier 1: Tersedia untuk Manusia",
  TIER_1_CLAIMED: "Tier 1: Misi Klaim Berjalan",
  TIER_2_ANIMAL_ACTIVE: "Tier 2: Alokasi Pakan Ternak",
  TIER_2_CLAIMED: "Tier 2: Penjemputan Pakan Diklaim",
  TIER_3_COMPOST_ACTIVE: "Tier 3: Residu Kompos Organik",
  TIER_3_COMPOST_CLAIMED: "Tier 3: Pengambilan Kompos Diklaim",
  COMPLETED: "Serah-Terima Selesai (Safe Harbor)",
  CANCELLED_BY_DONOR: "Dibatalkan Donatur"
};

const stateClass = (state) => ({
  TIER_1_HUMAN_ACTIVE: "tier-one",
  TIER_1_CLAIMED: "tier-one",
  TIER_2_ANIMAL_ACTIVE: "tier-two",
  TIER_2_CLAIMED: "tier-two",
  TIER_3_COMPOST_ACTIVE: "tier-three",
  TIER_3_COMPOST_CLAIMED: "tier-three",
  COMPLETED: "complete",
  CANCELLED_BY_DONOR: "cancelled"
}[state] || "neutral");

function icon(name, size) {
  const paths = {
    leaf: "<path d='M20 4c-7 0-13 3-15 10-1 4 2 6 5 5 7-2 10-8 10-15Z'/><path d='M5 19c3-4 6-7 11-10'/>",
    home: "<path d='m3 10 9-7 9 7'/><path d='M5 9v11h14V9'/><path d='M9 20v-6h6v6'/>",
    box: "<path d='m4 7 8-4 8 4-8 4-8-4Z'/><path d='M4 7v10l8 4 8-4V7M12 11v10'/>",
    chart: "<path d='M4 19V5M4 19h17'/><path d='m7 15 4-5 3 2 5-7'/>",
    users: "<path d='M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2'/><circle cx='9.5' cy='7' r='4'/><path d='M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/>",
    pin: "<path d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z'/><circle cx='12' cy='10' r='2.5'/>",
    clock: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    shield: "<path d='M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z'/><path d='m9 12 2 2 4-4'/>",
    camera: "<path d='M4 7h3l2-3h6l2 3h3v13H4z'/><circle cx='12' cy='13' r='4'/>",
    arrow: "<path d='M5 12h14M13 6l6 6-6 6'/>",
    search: "<circle cx='10.5' cy='10.5' r='6.5'/><path d='m16 16 5 5'/>",
    check: "<path d='m5 12 4 4L19 6'/>",
    menu: "<path d='M4 7h16M4 12h16M4 17h16'/>",
    bell: "<path d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'/>",
    logout: "<path d='M10 17l5-5-5-5M15 12H3'/><path d='M12 3h7v18h-7'/>",
    close: "<path d='m6 6 12 12M18 6 6 18'/>",
    map: "<path d='m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z'/><path d='M9 3v15M15 6v15'/>",
    qr: "<rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><path d='M14 14h3v3h-3zM20 14v2M14 20h2M20 19v2'/>",
    heart: "<path d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'/>",
    info: "<circle cx='12' cy='12' r='9'/><path d='M12 11v5M12 8h.01'/>",
    eye: "<path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z'/><circle cx='12' cy='12' r='3'/>",
    refresh: "<path d='M20 7v5h-5M4 17v-5h5'/><path d='M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2'/>",
    zap: "<polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/>"
  };
  return "<svg aria-hidden='true' width='" + (size || 18) + "' height='" + (size || 18) + "' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>" + (paths[name] || paths.info) + "</svg>";
}

function brand(inverse, href = "/") {
  return "<a class='brand" + (inverse ? " brand--inverse" : "") + "' href='" + href + "' aria-label='SIRKULA-AI, beranda'>" +
    "<span class='brand-mark brand-mark--logo'><img src='/assets/logo.png' alt='SIRKULA-AI' class='brand-logo-img'></span><span><strong>SIRKULA-AI</strong><small>Bio-Thermal Food Rescue</small></span></a>";
}

function simulationTag(label) {
  return "<span class='simulation-tag'>" + icon("zap", 12) + esc(label || "BIO-THERMAL AI") + "</span>";
}

function photo(scene, alt, data) {
  if (data) return "<div class='photo-frame'><img src='" + esc(data) + "' alt='" + esc(alt) + "' loading='lazy'></div>";
  const allowed = ["donor", "hub", "food", "bakery", "compost", "feed"];
  const safe = allowed.includes(scene) ? scene : "food";
  return "<div class='photo-frame scene scene--" + safe + "' role='img' aria-label='" + esc(alt) + "'></div>";
}

function statusBadge(state) {
  return "<span class='status-badge status-badge--" + stateClass(state) + "'><span class='status-dot'></span>" + esc(stateLabels[state] || state) + "</span>";
}

function batchStatus(item) {
  if (item.state === "TIER_3_COMPOST_ACTIVE" && item.claim) return "TIER_3_COMPOST_CLAIMED";
  return item.state;
}

function formatMinutesLeft(deadlineStr) {
  if (!deadlineStr) return null;
  const diff = new Date(deadlineStr).getTime() - Date.now();
  return Math.max(0, Math.round(diff / 60000));
}

function bioCountdownBadge(item) {
  const mins = item.tier1ExpiresAt ? formatMinutesLeft(item.tier1ExpiresAt) : item.safeWindowMinutes;
  if (item.state === "COMPLETED") {
    return "<span class='bio-countdown bio-countdown--safe'>" + icon("shield", 13) + " Diselamatkan: " + esc(item.completedTier || "Tier 1") + "</span>";
  }
  if (item.state === "TIER_2_ANIMAL_ACTIVE" || item.state === "TIER_2_CLAIMED") {
    const minsTier2 = item.tier2ExpiresAt ? formatMinutesLeft(item.tier2ExpiresAt) : 600;
    return "<span class='bio-countdown bio-countdown--warning'>" + icon("clock", 13) + " Pakan Ternak: " + minsTier2 + "m</span>";
  }
  if (item.state === "TIER_3_COMPOST_ACTIVE") {
    return "<span class='bio-countdown bio-countdown--danger'>" + icon("leaf", 13) + " Residu Kompos Organik</span>";
  }
  if (mins == null) return "";
  const variant = mins > 60 ? "safe" : mins > 15 ? "warning" : "danger";
  return "<span class='bio-countdown bio-countdown--" + variant + "'>" + icon("clock", 13) + " Sisa " + mins + "m (Q₁₀ Arrhenius)</span>";
}

function publicNav() {
  return "<header class='public-header'><div class='public-nav wrap'>" + brand(false) +
    "<nav class='public-links' aria-label='Navigasi utama'><a href='/#tentang'>Tentang</a><a href='/#cara-kerja'>Cara kerja</a><a href='/#pangan'>Jelajahi pangan</a><a href='/#dampak'>Dampak</a><a href='/#faq'>FAQ</a></nav>" +
    "<div class='public-actions'><a class='button button--quiet' href='/login'>Masuk</a><a class='button button--primary button--small' href='/register'>Daftar</a></div>" +
    "<details class='mobile-menu'><summary aria-label='Buka menu'>" + icon("menu") + "</summary><nav><a href='/#tentang'>Tentang</a><a href='/#cara-kerja'>Cara kerja</a><a href='/#pangan'>Jelajahi pangan</a><a href='/#dampak'>Dampak</a><a href='/#faq'>FAQ</a><a href='/login'>Masuk</a><a href='/register'>Daftar</a></nav></details>" +
    "</div></header>";
}

function foodCard(item, actionLabel) {
  const distanceStr = item.distanceMeters != null
    ? "📍 " + (item.distanceMeters < 1000 ? Math.round(item.distanceMeters) + " m" : (item.distanceMeters / 1000).toFixed(1) + " km")
    : "📍 " + esc(item.area);
  const containerStr = item.recommendedContainer ? "<small style='display:block; color:#0b7a6b; font-weight:600; margin-top:4px;'>📦 Wadah: " + esc(item.recommendedContainer) + "</small>" : "";

  return "<article class='food-card'>" + photo(item.scene, item.title, item.photoData) +
    "<div class='food-card__body'><div class='food-card__top'><span class='eyebrow'>" + esc(item.category) + "</span>" + bioCountdownBadge(item) + "</div>" +
    "<h3>" + esc(item.title) + "</h3><p class='food-card__donor'>" + esc(item.donor) + "</p>" +
    "<div class='food-meta'><span>" + icon("users", 15) + esc(item.portions ? money(item.portions) + " porsi" : money(item.weightKg) + " kg") + "</span><span>" + icon("pin", 15) + distanceStr + "</span></div>" +
    containerStr +
    "<div class='food-card__foot'>" + statusBadge(batchStatus(item)) + "<a class='text-link' href='/batches/" + encodeURIComponent(item.id) + "'>" + esc(actionLabel || "Lihat detail") + " " + icon("arrow", 15) + "</a></div></div></article>";
}

function landing(state) {
  const samples = state.batches.filter((item) => item.state === "TIER_1_HUMAN_ACTIVE").slice(0, 3);
  const sampleCards = samples.length ? samples.map((item) => foodCard(item)).join("") : "<div class='empty-state'><h3>Belum ada batch aktif di radar.</h3><p>Daftar sebagai Donatur untuk merilis batch perdana via AI.</p></div>";
  return publicNav() +
    "<main id='main'><section class='hero wrap'><div class='hero-copy'><span class='eyebrow eyebrow--pill'>" + icon("leaf", 15) + " EKOSISTEM PENYELAMATAN PANGAN BERBASIS BIO-THERMAL AI</span>" +
    "<h1>Selamatkan pangan berlebih,<br><em>sebarkan kebaikan.</em></h1><p class='hero-lead'>Platform orkestrasi 6-peran penyelamatan pangan kota dengan Computer Vision Zero-Click Ingestion, degradasi biologis Arrhenius Q₁₀, dan Safe Harbor Digital Liability Waiver.</p>" +
    "<div class='hero-actions'><a class='button button--primary button--large' href='/#pangan'>Jelajahi Radar Pangan " + icon("arrow") + "</a><a class='button button--outline button--large' href='/register'>Daftarkan Makanan (Zero-Click)</a></div>" +
    "<p class='hero-note'><span class='note-mark'>" + icon("check", 14) + "</span> Perlindungan Hukum Good Samaritan & Transparansi Emisi Karbon CO₂e.</p></div>" +
    "<div class='hero-visual'>" + photo("donor", "Staf katering menyiapkan makanan untuk disalurkan.") +
    "<div class='hero-sticker hero-sticker--top'><span class='sticker-icon'>" + icon("camera", 17) + "</span><span><strong>Zero-Click Vision AI</strong><small>Gemini 2.5 Flash &le; 15 detik</small></span></div>" +
    "<div class='hero-sticker hero-sticker--bottom'><span class='sticker-icon sticker-icon--warm'>" + icon("heart", 17) + "</span><span><strong>Arrhenius Q₁₀ Decay</strong><small>Mitigasi Risiko Keracunan</small></span></div>" +
    "<div class='hero-visual__caption'><span class='pulse-dot'></span> Menghubungkan Katering & Restoran ke Simpul Warga Kota Bandung.</div></div></section>" +
    "<section id='tentang' class='section section--problem'><div class='wrap'><div class='section-heading'><span class='section-index'>01 / MENGAPA SIRKULA-AI</span><h2>Di satu sisi makanan berlebih,<br>di sisi lain masih banyak yang membutuhkan.</h2><p>Solusi komprehensif mengintegrasikan bio-safety invariant, geolokasi presisi, dan mitigasi emisi gas metana.</p></div>" +
    "<div class='problem-grid'><article class='problem-item'><span class='problem-number'>01</span><h3>Zero-Click Ingestion</h3><p>Donatur lelah tidak perlu mengetik. Cukup 1 foto + 1 slider waktu, AI mengekstrak porsi, berat, dan jenis wadah.</p></article><article class='problem-item'><span class='problem-number'>02</span><h3>Arrhenius Q₁₀ Bio-Thermal</h3><p>Menghitung sisa waktu aman mikrobiologis real-time berdasarkan suhu ambien Bandung.</p></article><article class='problem-item'><span class='problem-number'>03</span><h3>Digital Liability Waiver</h3><p>Handover handshake menerbitkan sertifikat bebas tuntutan hukum berbasis SHA-256 (Good Samaritan Law).</p></article></div></div></section>" +
    "<section class='section section--ecosystem'><div class='wrap'><div class='section-heading section-heading--center'><span class='section-index'>02 / 3-TIER TRIAGE PIRAMIDA</span><h2>Setiap tahap punya tujuan yang jelas.</h2><p>Penyaluran konsumsi manusia menjadi prioritas mutlak. Jika terlewat, otomatis dialihkan ke pakan ternak dan kompos.</p></div>" +
    "<div class='tier-grid'><article class='tier-card tier-card--human'>" + photo("hub", "Relawan komunitas menerima makanan dalam kemasan.") + "<div class='tier-card__content'><span class='tier-number'>TIER 01</span><h3>Konsumsi Manusia (Prioritas)</h3><p>Simpul komunitas (Masjid, Dapur Warga, Panti Asuhan) menjemput makanan layak konsumsi.</p><span class='tier-priority'>" + icon("heart", 15) + " Prioritas Utama</span></div></article>" +
    "<article class='tier-card tier-card--feed'>" + photo("feed", "Peternak meninjau bahan untuk pemanfaatan pakan.") + "<div class='tier-card__content'><span class='tier-number'>TIER 02</span><h3>Biokonversi Pakan Ternak</h3><p>Peternak Maggot BSF, lele, dan unggas memanfaatkan biomassa yang melewati batas konsumsi manusia.</p><span class='tier-priority'>" + icon("shield", 15) + " Keamanan Pakan Terjamin</span></div></article>" +
    "<article class='tier-card tier-card--compost'>" + photo("compost", "Pengelolaan bahan organik untuk kompos.") + "<div class='tier-card__content'><span class='tier-number'>TIER 03</span><h3>Kompos Organik & TPST</h3><p>Bank sampah induk dan TPST/TPS3R mengolah residu organik kota untuk mencegah gas metana.</p><span class='tier-priority'>" + icon("leaf", 15) + " Sirkularitas Karbon</span></div></article></div>" +
    "<p class='safety-note'>" + icon("info", 16) + "<span>Safety Invariant Protocol: Verifikasi serah-terima manusia yang terlambat seketika ditolak otomatis oleh backend (HTTP 422).</span></p></div></section>" +
    "<section id='pangan' class='section section--food'><div class='wrap'><div class='section-heading section-heading--split'><div><span class='section-index'>03 / JELAJAHI RADAR PANGAN</span><h2>Pangan aktif yang tersedia di sekitar Anda.</h2></div><div><p>Posisi koordinat publik disamarkan dalam radius 1.500m demi keamanan dan privasi mitra.</p><a class='text-link text-link--large' href='/login'>Masuk ke Radar Presisi " + icon("arrow", 16) + "</a></div></div>" +
    "<div class='food-grid'>" + sampleCards + "</div></div></section>" +
    "<section class='section section--ai'><div class='wrap ai-section'><div class='ai-copy'><span class='section-index'>04 / VISION AI INGESTION</span><h2>Unggah 1 Foto. AI selesaikan sisanya.</h2><p>Gemini 2.5 Flash mengenali menu, taksiran porsi, berat biomassa, kategori risiko mikrobiologis, hingga wadah logistik yang disarankan secara otomatis.</p><ul class='check-list'><li>" + icon("check", 16) + " Zero manual form typing</li><li>" + icon("check", 16) + " Arrhenius Q₁₀ Bio-Thermal Guard</li><li>" + icon("check", 16) + " Integrasi API Cuaca Terbuka</li></ul><a class='text-link' href='/register'>Coba Zero-Click Sekarang " + icon("arrow", 15) + "</a></div>" +
    "<div class='ai-preview'>" + photo("food", "Contoh makanan siap santap untuk layar pratinjau AI") + "<div class='ai-preview__panel'><div class='ai-preview__head'><span class='sticker-icon'>" + icon("camera", 17) + "</span><div><strong>Gemini 2.5 Flash Engine</strong><small>Telemetri 29°C Ambient</small></div><span class='confidence'>94%<small>Confidence</small></span></div><div class='ai-result'><span>Deteksi AI</span><strong>Paket Ayam Bakar & Nasi</strong><span>Safe window: 175 menit (Arrhenius Q₁₀)</span></div><a class='button button--outline button--small' href='/register'>Mulai Sekarang</a></div></div></div></section>" +
    "<section id='cara-kerja' class='section section--steps'><div class='wrap'><div class='section-heading section-heading--center'><span class='section-index'>05 / CARA KERJA</span><h2>Dari kelebihan pangan hingga sertifikat hukum ESG.</h2></div><ol class='steps-list'><li><span>01</span><div><h3>1-Klik Foto Donatur</h3><p>Ambil foto makanan, atur slider jam pemaparan, dan kirim ke backend AI.</p></div></li><li><span>02</span><div><h3>Radar PostGIS & Q₁₀ Timer</h3><p>Simpul terdekat melihat ketersediaan dengan hitung mundur Arrhenius.</p></div></li><li><span>03</span><div><h3>Klaim Atomic Redis</h3><p>Penerima mengunci kuota tanpa risiko benturan klaim ganda.</p></div></li><li><span>04</span><div><h3>Loading Dock Handshake</h3><p>Pindai dynamic QR HMAC saat pengambilan makanan.</p></div></li><li><span>05</span><div><h3>Waiver Certificate Dirilis</h3><p>Nomor sertifikat unik dan SHA-256 membebaskan tanggung jawab donatur.</p></div></li></ol></div></section>" +
    "<section id='dampak' class='section section--impact'><div class='wrap impact-layout'><div><span class='section-index section-index--light'>06 / DAMPAK</span><h2>Telemetri ESG Kota Bandung.</h2><p>Agregasi riil pencegahan gas metana dan reduksi emisi karbon berbasis standar IPCC.</p>" + simulationTag("TELEMETRI AKTIF") + "</div><div class='impact-grid'><div><strong>" + money(state.esgSummary?.total_portions_saved || 2480) + "</strong><span>Porsi Diselamatkan</span></div><div><strong>" + (state.esgSummary?.total_weight_saved_kg || 620).toFixed(1) + " kg</strong><span>Biomassa Pangan</span></div><div><strong>" + (state.esgSummary?.co2e_avoided_kg || 1550).toFixed(1) + " kg</strong><span>Emisi CO₂e Dihindari</span></div><div><strong>Rp " + money(state.esgSummary?.estimated_feed_savings_idr || 1240000) + "</strong><span>Efisiensi Pakan Ternak</span></div></div></div></section>" +
    "<section id='faq' class='section section--faq'><div class='wrap faq-layout'><div class='section-heading'><span class='section-index'>07 / FAQ</span><h2>Pertanyaan Umum & Regulasi.</h2><p>Standar keamanan pangan, perlindungan hukum, dan teknologi SIRKULA-AI.</p></div><div class='faq-list'><details><summary>Apa itu Zero-Click Vision Ingestion?</summary><p>Inovasi di mana donatur hanya mengunggah 1 foto makanan sisa tanpa mengetik manual. Gemini 2.5 Flash menganalisis nama menu, taksiran porsi, total berat (kg), kategori risiko mikrobiologis, dan wadah logistik dalam waktu ≤ 15 detik.</p></details><details><summary>Bagaimana model Bio-Thermal Arrhenius Q₁₀ bekerja?</summary><p>Model ini mengalkulasi laju degradasi mikrobiologis pangan secara matematis berdasarkan suhu lingkungan riil Kota Bandung (Q₁₀ = 2.2, Tref = 25°C). Jika suhu lebih panas, jendela waktu aman berkurang secara eksponensial.</p></details><details><summary>Apa itu Digital Liability Waiver?</summary><p>Sertifikat digital berkode hash SHA-256 yang diterbitkan otomatis saat serah-terima valid. Mengacu pada doktrin Good Samaritan, sertifikat ini melindungi donatur dari tuntutan hukum perdata.</p></details><details><summary>Apa yang terjadi jika makanan melewati batas waktu Tier 1?</summary><p>Safety Invariant Protocol secara tegas menolak serah-terima manusia (HTTP 422) dan mengalihkan batch ke Tier 2 (Pakan Ternak Maggot BSF/Unggas) demi pencegahan keracunan makanan.</p></details></div></div></section>" +
    "<section class='final-cta'><div class='wrap final-cta__inner'><div><span class='section-index section-index--light'>AKSI NYATA</span><h2>Jangan biarkan makanan berlebih terbuang percuma.</h2></div><div class='final-cta__actions'><a class='button button--white' href='/register'>Daftar Sebagai Donatur</a><a class='button button--outline-light' href='/login'>Masuk ke Sistem</a></div></div></section></main>" +
    "<footer class='public-footer'><div class='wrap footer-layout'>" + brand(false) + "<p>Ekosistem Penyelamatan Pangan Multi-Peran Terintegrasi AI Vision & Bio-Thermal Guard.</p><nav aria-label='Navigasi footer'><a href='/#tentang'>Tentang</a><a href='/#cara-kerja'>Cara kerja</a><a href='/#faq'>FAQ</a><a href='mailto:halo@sirkula.ai'>Kontak SIRKULA-AI</a></nav><small>© 2026 SIRKULA-AI · Bandung Food Rescue Ecosystem</small><p class='footer-disclaimer'><small>Catatan SIMULASI: AI tidak menentukan keamanan pangan secara mutlak; verifikasi visual dan sensorik manusia tetap diwajibkan.</small></p></div></footer>";
}

function authPage(routeName, state) {
  const actor = getCurrentActor();
  if (routeName === "/select-role") {
    if (!actor) return authPage("/login", state);
    const options = actor.roles.map((role) => "<button class='role-choice' type='button' data-action='select-role' data-role='" + esc(role) + "'><span class='role-choice__icon'>" + icon(role === "DONOR" ? "box" : role === "ESG_AUDITOR" ? "chart" : role === "SIMULATOR_ADMIN" ? "zap" : "users") + "</span><span><strong>" + esc(ROLES[role].label) + "</strong><small>" + esc(ROLES[role].description) + "</small></span>" + icon("arrow") + "</button>").join("");
    return "<main id='main' class='auth-page'><div class='auth-brand'>" + brand(false) + "</div><section class='auth-card'><span class='section-index'>PILIH RUANG KERJA</span><h1>Halo, " + esc(actor.name) + ".</h1><p>Akun Anda memiliki akses ke peran berikut.</p><div class='role-choice-list'>" + options + "</div><a class='text-link' href='/profile'>Kelola profil " + icon("arrow", 15) + "</a></section></main>";
  }
  const isRegister = routeName === "/register";
  return "<main id='main' class='auth-page'><div class='auth-brand'>" + brand(false) + "<a class='text-link' href='/'>Kembali ke beranda " + icon("arrow", 15) + "</a></div><div class='auth-layout'><section class='auth-intro'>" + photo("hub", "Relawan komunitas menata makanan yang akan disalurkan") + "<span class='eyebrow eyebrow--pill'>SELAMATKAN PANGAN, SEBARKAN KEBAIKAN</span><h1>" + (isRegister ? "Bergabung dalam Gerakan." : "Selamat Datang Kembali.") + "</h1><p>" + (isRegister ? "Daftarkan usaha katering, restoran, simpul warga, atau peternak Anda untuk menyelamatkan pangan bersama SIRKULA-AI." : "Masuk dengan akun terdaftar Anda untuk mengelola batch dan aksi penyelamatan pangan.") + "</p></section><section class='auth-card'><span class='section-index'>" + (isRegister ? "PENDAFTARAN AKUN" : "AUTENTIKASI AKUN") + "</span><h2>" + (isRegister ? "Daftar Akun Baru" : "Masuk ke SIRKULA-AI") + "</h2><p class='muted'>" + (isRegister ? "Lengkapi data untuk mendaftar ke ekosistem." : "Gunakan email dan password terdaftar Anda.") + "</p>" +
    (isRegister ? registerForm() : "<form data-form='login' novalidate><label>Email Terdaftar<input name='email' type='email' autocomplete='username' required placeholder='contoh: catering@sabuga.itb.ac.id'></label><label>Password<span class='password-wrap'><input name='password' type='password' autocomplete='current-password' required minlength='6' placeholder='Masukkan password (demo: demo123 atau Sirkula2026!)'><button type='button' class='icon-button' data-action='toggle-password' aria-label='Tampilkan password'>" + icon("eye", 17) + "</button></span></label><div class='form-row form-row--between'><label class='check-label'><input type='checkbox' name='remember' value='yes'> Ingat email di perangkat ini</label><a href='/#faq'>Bantuan masuk</a></div><p class='form-error' data-form-error hidden></p><button class='button button--primary button--full' type='submit'>Masuk ke Sistem " + icon("arrow") + "</button></form>") +
    "<p class='auth-switch'>" + (isRegister ? "Sudah memiliki akun terdaftar? <a href='/login'>Masuk ke sini</a>" : "Belum memiliki akun? <a href='/register'>Daftar akun baru di sini</a>") + "</p></section></div></main>";
}

function registerForm() {
  const roleOptions = [
    ["DONOR", "Donor Pangan (Katering, Restoran, Hotel, Warteg)"],
    ["TIER_1_HUB", "Simpul Komunitas (Masjid, Panti Asuhan, Dapur RT/RW)"],
    ["TIER_2_FARMER", "Pengelola Pakan Ternak (Maggot BSF, Lele, Unggas)"],
    ["TIER_3_COMPOST", "Pengelola Kompos Organik (Bank Sampah, Komunitas)"],
    ["ESG_AUDITOR", "Auditor ESG & DLH (Pemantau Dampak Lingkungan)"],
    ["SIMULATOR_ADMIN", "Admin & Dewan Juri (Akses Pengujian Sistem)"]
  ];
  return "<form data-form='register' novalidate>" +
    "<label>Nama Penanggung Jawab<input name='name' required autocomplete='name' placeholder='Nama lengkap'></label>" +
    "<label>Nama Usaha / Komunitas / Instansi<input name='businessName' required placeholder='Contoh: Katering Barokah Dago'></label>" +
    "<div class='form-grid'>" +
      "<label>Email Resmi<input name='email' type='email' required autocomplete='email' placeholder='nama@domain.id'></label>" +
      "<label>Nomor WhatsApp<input name='phone' type='tel' required autocomplete='tel' placeholder='+6281234567890'></label>" +
    "</div>" +
    "<label>Alamat Lengkap / Wilayah<input name='area' required placeholder='Jl. Tamansari No. 73, Coblong, Kota Bandung'></label>" +
    "<label>Pilih Peran dalam Ekosistem<select name='activeRole' required>" +
      roleOptions.map((item) => "<option value='" + item[0] + "'>" + item[1] + "</option>").join("") +
    "</select></label>" +
    "<label>Password<input type='password' name='password' minlength='6' required autocomplete='new-password' placeholder='Minimal 6 karakter'></label>" +
    "<label>Ulangi Password<input type='password' name='confirmPassword' minlength='6' required autocomplete='new-password' placeholder='Konfirmasi password'></label>" +
    "<p class='form-error' data-form-error hidden></p>" +
    "<button class='button button--primary button--full' type='submit'>Daftar & Masuk ke Sistem " + icon("arrow") + "</button>" +
  "</form>";
}

function appNav(role) {
  const common = [
    ["/dashboard", "home", "Beranda"],
    ["/dashboard/food-batches", "box", role === "DONOR" ? "Batch Saya" : role === "TIER_1_HUB" ? "Radar Pangan (Tier 1)" : role === "TIER_2_FARMER" ? "Radar Pakan (Tier 2)" : role === "TIER_3_COMPOST" ? "Residu Kompos (Tier 3)" : "Batch Makanan"],
    ["/missions", "pin", "Misi Penyelamatan"],
    ["/profile", "users", "Profil Akun"]
  ];
  const audit = [
    ["/dashboard", "chart", "Command Center"],
    ["/dashboard/food-batches", "box", "Radar Pangan Kota"],
    ["/dashboard/donors", "users", "Direktori Donor"],
    ["/dashboard/receivers", "users", "Simpul Penerima"],
    ["/dashboard/analytics", "chart", "ESG & Karbon"],
    ["/legal-vault", "shield", "Legal Vault (Waiver)"]
  ];
  if (role === "SIMULATOR_ADMIN") audit.push(["/simulation", "zap", "God-Mode Simulator"]);
  if (role === "ESG_AUDITOR") return audit;
  if (role === "SIMULATOR_ADMIN") return audit;
  if (role === "DONOR") common.splice(2, 0, ["/batches/new", "camera", "Zero-Click Ingesti"]);
  return common;
}

function appShell(route, state, content) {
  const role = state.activeRole;
  const actor = getCurrentActor();
  const dark = false; // Tema light konsisten & bersih untuk seluruh role termasuk Admin & Auditor
  const nav = appNav(role);
  const currentPath = route.path;
  const navLinks = nav.map((item) => "<a class='side-link" + (currentPath === item[0] || (item[0] === "/dashboard" && currentPath === "/dashboard") ? " is-active" : "") + "' href='" + item[0] + "'>" + icon(item[1], 18) + "<span>" + item[2] + "</span></a>").join("");
  const mobileNav = role === "DONOR" ? [nav[0], nav.find((item) => item[0] === "/batches/new"), nav.find((item) => item[0] === "/missions"), nav.find((item) => item[0] === "/profile")] : role === "ESG_AUDITOR" ? [nav[0], nav[1], nav.find((item) => item[0] === "/dashboard/analytics"), nav.find((item) => item[0] === "/legal-vault")] : role === "SIMULATOR_ADMIN" ? [nav[0], nav[1], nav.find((item) => item[0] === "/simulation"), ["/profile", "users", "Profil"]] : [nav[0], nav[1], nav.find((item) => item[0] === "/missions"), nav.find((item) => item[0] === "/profile")];
  const bottomLinks = mobileNav.filter(Boolean).map((item) => "<a class='bottom-link" + (currentPath === item[0] ? " is-active" : "") + "' href='" + item[0] + "'>" + icon(item[1], 19) + "<span>" + item[2] + "</span></a>").join("");
  const unread = state.notifications.filter((item) => !item.read).length;
  const wsBadge = state.wsConnected !== false
    ? "<span class='ws-badge' title='Gateway Real-Time Terhubung (ONLINE)' style='display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; background:rgba(16,185,129,0.12); color:#059669; padding:2px 8px; border-radius:12px; font-weight:600;'><span style='width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;'></span>ONLINE</span>"
    : "<span class='ws-badge' title='Gateway Terputus (OFFLINE)' style='display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; background:rgba(239,68,68,0.12); color:#dc2626; padding:2px 8px; border-radius:12px; font-weight:600;'><span style='width:6px; height:6px; border-radius:50%; background:#ef4444;'></span>OFFLINE</span>";
  return "<div class='app-shell" + (dark ? " app-shell--dark" : "") + "'>" +
    "<aside class='sidebar'><div class='sidebar-brand'>" + brand(dark, "/dashboard") + "</div><div class='workspace-label'>RUANG KERJA</div><nav class='side-nav' aria-label='Navigasi aplikasi'>" + navLinks + "</nav><div class='sidebar-bottom'><div class='demo-reminder'>" + simulationTag("SIRKULA ECOSYSTEM") + "<p>Sesi aktif pada profil terdaftar.</p></div><a class='profile-mini' href='/profile'><span class='avatar'>" + esc((actor?.name || "A").slice(0, 1)) + "</span><span><strong>" + esc(actor?.businessName || "Akun Terdaftar") + "</strong><small>" + esc(ROLES[role].label) + "</small></span>" + icon("arrow", 15) + "</a></div></aside>" +
    "<div class='app-main'><header class='app-header'><div class='mobile-brand'>" + brand(dark, "/dashboard") + "</div><div class='header-context'><span class='header-role'>" + esc(ROLES[role].label) + "</span><span class='header-separator'>/</span><span>" + esc(actor?.businessName || "Ruang Kerja") + "</span>" + wsBadge + "</div><div class='header-actions'><button class='icon-button notification-button' type='button' data-action='notifications' aria-label='Buka notifikasi'>" + icon("bell", 18) + (unread ? "<span class='notification-count'>" + unread + "</span>" : "") + "</button><a class='avatar avatar--header' href='/profile' aria-label='Profil'>" + esc((actor?.name || "A").slice(0, 1)) + "</a></div></header>" +
    "<main id='main' class='app-content'>" + content + "</main><nav class='bottom-nav' aria-label='Navigasi utama'>" + bottomLinks + "</nav></div></div>";
}

function pageTitle(kicker, title, description, actions) {
  return "<div class='page-title'><div><span class='section-index'>" + esc(kicker) + "</span><h1>" + esc(title) + "</h1><p>" + esc(description) + "</p></div><div class='page-title__actions'>" + (actions || "") + "</div></div>";
}

function statCard(value, label, detail, iconName) {
  return "<article class='stat-card'><div class='stat-card__top'><span>" + icon(iconName || "chart", 17) + "</span>" + simulationTag("TELEMETRI") + "</div><strong>" + esc(value) + "</strong><span class='stat-label'>" + esc(label) + "</span><small>" + esc(detail) + "</small></article>";
}

function emptyState(title, body, action) {
  return "<div class='empty-state'><span class='empty-state__icon'>" + icon("box", 24) + "</span><h3>" + esc(title) + "</h3><p>" + esc(body) + "</p>" + (action || "") + "</div>";
}

function batchTable(items) {
  if (!items.length) return emptyState("Belum ada batch di sini", "Batch baru akan muncul setelah dirilis melalui Zero-Click Ingestion.", "<a class='button button--outline' href='/batches/new'>Rilis Batch via AI</a>");
  return "<div class='table-wrap'><table><thead><tr><th>Batch</th><th>Donor</th><th>Jumlah</th><th>Wilayah (Radar)</th><th>Bio-Safety</th><th>Status</th><th></th></tr></thead><tbody>" + items.map((item) => "<tr><td><a class='table-item' href='/batches/" + encodeURIComponent(item.id) + "'>" + esc(item.title) + "</a><small>" + esc(item.category) + "</small></td><td>" + esc(item.donor) + "</td><td>" + esc(item.portions ? money(item.portions) + " porsi" : money(item.weightKg) + " kg") + "</td><td>" + esc(item.area) + (item.distanceMeters ? " <br><small style='color:#0b7a6b;'>(" + (item.distanceMeters < 1000 ? Math.round(item.distanceMeters) + " m" : (item.distanceMeters / 1000).toFixed(1) + " km") + ")</small>" : "") + "</td><td>" + bioCountdownBadge(item) + "</td><td>" + statusBadge(batchStatus(item)) + "</td><td><a class='table-open' href='/batches/" + encodeURIComponent(item.id) + "' aria-label='Buka batch " + esc(item.title) + "'>" + icon("arrow", 16) + "</a></td></tr>").join("") + "</tbody></table></div>";
}

function mapSketch(items) {
  const count = items.length;
  return "<div class='sirkula-map-wrapper' style='position:relative; width:100%; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;'>" +
    "<div id='sirkula-map-canvas' class='sirkula-map-canvas' style='height: 380px; width: 100%; border-radius: 12px; z-index: 1;'></div>" +
    "<div class='map-legend' style='position:absolute; bottom:12px; right:12px; z-index:400; background:rgba(255,255,255,0.92); color:#1e293b; padding:8px 12px; border-radius:8px; font-size:11px; backdrop-filter:blur(6px); border:1px solid rgba(0,0,0,0.08); box-shadow:0 2px 8px rgba(0,0,0,0.08);'>" +
      "<div style='font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;'><span style='display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;'></span> RADAR SPASIAL POSTGIS (" + count + " BATCH AKTIF)</div>" +
      "<div style='display:flex; gap:10px; font-size:10px; color:#64748b;'>" +
        "<span><i style='display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; margin-right:3px;'></i> Tier 1 Manusia</span>" +
        "<span><i style='display:inline-block; width:7px; height:7px; border-radius:50%; background:#f59e0b; margin-right:3px;'></i> Tier 2 Pakan</span>" +
        "<span><i style='display:inline-block; width:7px; height:7px; border-radius:50%; background:#8b5cf6; margin-right:3px;'></i> Tier 3 Kompos</span>" +
      "</div>" +
    "</div>" +
  "</div>";
}

function batchGrid(items) {
  return items.length ? "<div class='batch-grid'>" + items.map((item) => foodCard(item, "Detail & Klaim")).join("") + "</div>" : emptyState("Belum ada makanan tersedia di radar", "Pilih filter lain atau kembali setelah donatur merilis batch baru.", "<a class='button button--outline' href='/dashboard'>Kembali ke dashboard</a>");
}

function roleBatches(role, state) {
  const batches = state.batches;
  if (role === "DONOR") {
    const actorId = state.activeActorId;
    const mappedActorId = (UUID_ALIAS_MAP && UUID_ALIAS_MAP[actorId]) || actorId;
    return batches.filter((item) => {
      const itemDonorId = (UUID_ALIAS_MAP && UUID_ALIAS_MAP[item.donorId]) || item.donorId;
      return itemDonorId === mappedActorId || item.donorId === actorId || !actorId;
    });
  }
  if (role === "TIER_1_HUB") return batches.filter((item) => item.state === "TIER_1_HUMAN_ACTIVE" && !item.claim);
  if (role === "TIER_2_FARMER") return batches.filter((item) => item.state === "TIER_2_ANIMAL_ACTIVE" && !item.claim);
  if (role === "TIER_3_COMPOST") return batches.filter((item) => item.state === "TIER_3_COMPOST_ACTIVE" && !item.claim);
  return batches;
}

function overviewPage(role, state) {
  const actor = getCurrentActor();
  const accessible = roleBatches(role, state);
  const activeCount = accessible.filter((item) => !["COMPLETED", "CANCELLED_BY_DONOR"].includes(item.state)).length;
  const completed = state.batches.filter((item) => item.state === "COMPLETED");
  const totalPortions = completed.reduce((sum, item) => sum + (item.portions || 0), 0);
  const totalKg = completed.reduce((sum, item) => sum + (item.weightKg || 0), 0);
  const greeting = "Selamat datang, " + (actor?.name || "Mitra");
  const titleAction = role === "DONOR" ? "<a class='button button--primary' href='/batches/new'>" + icon("camera", 17) + " Zero-Click Ingesti</a>" : "";

  // 65/35 Split Grid Dark Mode for ESG_AUDITOR & SIMULATOR_ADMIN
  if (role === "ESG_AUDITOR" || role === "SIMULATOR_ADMIN") {
    return renderCommandCenterOverview(role, state, actor);
  }

  let stats = "";
  if (role === "DONOR") {
    stats = statCard(activeCount, "Batch Saya Aktif", "Dalam pemantauan Arrhenius", "box") +
      statCard(state.batches.filter((item) => item.donorId === state.activeActorId && item.claim).length, "Klaim Menunggu Handshake", "Siap verifikasi loading dock", "users") +
      statCard(money(state.batches.filter((item) => item.donorId === state.activeActorId).reduce((sum, item) => sum + (item.portions || 0), 0)), "Total Porsi Didonasikan", "Terverifikasi sistem", "chart");
  } else if (role === "TIER_1_HUB") {
    stats = statCard(accessible.length, "Pangan Manusia di Radar", "Layak konsumsi (Tier 1)", "box") +
      statCard(state.batches.filter((item) => item.claim?.actorId === state.activeActorId && item.state === "TIER_1_CLAIMED").length, "Misi Penjemputan", "Tunjukkan kode QR ke donatur", "pin") +
      statCard(totalPortions, "Porsi Tersalurkan", "Seluruh simpul komunitas", "heart");
  } else if (role === "TIER_2_FARMER") {
    stats = statCard(accessible.length, "Biomassa Pakan di Radar", "Terdegradasi aman pakan (Tier 2)", "box") +
      statCard(accessible.reduce((sum, item) => sum + (item.weightKg || 0), 0).toFixed(1) + " kg", "Biomassa Tersedia", "Siap biokonversi Maggot/Lele", "chart") +
      statCard(state.batches.filter((item) => item.claim?.actorId === state.activeActorId).length, "Misi Pakan Saya", "Klaim terkonfirmasi", "pin");
  } else if (role === "TIER_3_COMPOST") {
    stats = statCard(accessible.length, "Residu Kompos Tersedia", "Siap olah TPST/TPS3R", "box") +
      statCard(accessible.reduce((sum, item) => sum + (item.weightKg || 0), 0).toFixed(1) + " kg", "Residu Organik", "Pencegahan metana anaerobik", "chart") +
      statCard(state.batches.filter((item) => item.claim?.actorId === state.activeActorId).length, "Misi Kompos", "Klaim terkonfirmasi", "pin");
  }

  const heading = pageTitle("RUANG KERJA LAPANGAN", greeting, "Pantau alur penyelamatan pangan berbasis telemetri bio-thermal.", titleAction);
  const map = role === "TIER_1_HUB" || role === "TIER_2_FARMER" ? "<section class='panel map-panel'><div class='panel-heading'><div><span class='section-index'>RADAR SPASIAL POSTGIS</span><h2>" + (role === "TIER_1_HUB" ? "Radar Pangan Konsumsi Manusia" : "Radar Biomassa Pakan Ternak") + "</h2></div><a class='text-link' href='/dashboard/food-batches'>Buka Radar Penuh " + icon("arrow", 15) + "</a></div>" + mapSketch(accessible) + "</section>" : "";
  const feed = "<section class='panel'><div class='panel-heading'><div><span class='section-index'>" + (role === "DONOR" ? "BATCH TERBARU" : "TERSEDIA DI RADAR") + "</span><h2>" + (role === "DONOR" ? "Makanan yang Anda Donasikan" : role === "TIER_2_FARMER" ? "Pemanfaatan Pakan Maggot & Ternak" : role === "TIER_3_COMPOST" ? "Residu Kompos Kota" : "Batch Penyelamatan Pangan") + "</h2></div><a class='text-link' href='/dashboard/food-batches'>Lihat Semua " + icon("arrow", 15) + "</a></div>" + (role === "DONOR" ? batchTable(accessible.slice(0, 5)) : batchGrid(accessible.slice(0, 4))) + "</section>";
  const activity = "<section class='panel activity-panel'><div class='panel-heading'><div><span class='section-index'>TELEMETRI & AUDIT</span><h2>Log Mutasi Sistem</h2></div><a class='text-link' href='/missions'>Semua Misi " + icon("arrow", 15) + "</a></div>" + activityList(state.auditLog.slice(0, 4)) + "</section>";

  return heading + "<div class='stats-grid'>" + stats + "</div><div class='dashboard-grid'>" + map + feed + activity + "</div>";
}

function renderCommandCenterOverview(role, state, actor) {
  const isSim = role === "SIMULATOR_ADMIN";
  const completed = state.batches.filter((item) => item.state === "COMPLETED");
  const totalKg = state.esgSummary?.total_weight_saved_kg ?? completed.reduce((sum, item) => sum + (item.weightKg || 0), 0);
  const totalPortions = state.esgSummary?.total_portions_saved ?? completed.reduce((sum, item) => sum + (item.portions || 0), 0);
  const co2e = state.esgSummary?.co2e_avoided_kg ?? (Number(totalKg) * 2.5).toFixed(1);
  const ch4 = state.esgSummary?.methane_ch4_avoided_kg ?? (Number(totalKg) * 0.15).toFixed(2);
  const activeBatches = state.batches.filter((item) => !["COMPLETED", "CANCELLED_BY_DONOR"].includes(item.state));

  const heading = pageTitle(
    isSim ? "GOD-MODE SIMULATOR COMMAND CENTER" : "ESG & IMPACT AUDIT COMMAND CENTER",
    "Pusat Pemantauan Makro Kota Bandung",
    isSim ? "Pengendalian telemetri Arrhenius Q₁₀, override cuaca ekstrim, dan pengujian Safety Invariant Enforcer." : "Telemetri pencegahan metana, reduksi emisi karbon CO₂e, dan arsip sertifikat Good Samaritan."
  );

  const leftMapCol = "<div class='command-map-wrap' style='display:flex; flex-direction:column; gap:16px;'>" +
    "<div class='panel map-panel'>" +
      "<div class='panel-heading'><div><span class='section-index'>SPATIOTEMPORAL RADAR</span><h2>Sebaran Pangan Aktif Kota Bandung</h2></div><a class='text-link' href='/dashboard/food-batches'>Daftar Batch " + icon("arrow", 15) + "</a></div>" +
      mapSketch(activeBatches) +
    "</div>" +
    "<div class='panel'>" +
      "<div class='panel-heading'><div><span class='section-index'>BATCH AKTIF DALAM RADAR</span><h2>Telemetri Bio-Thermal Live</h2></div></div>" +
      batchTable(activeBatches.slice(0, 6)) +
    "</div>" +
  "</div>";

  let rightSidebarCol = "";
  if (isSim) {
    const selected = activeBatches[0];
    const temp = selected?.temperatureC || 29;
    const q10Factor = Math.pow(2.2, (temp - 25) / 10).toFixed(2);
    rightSidebarCol = "<div class='command-side-wrap' style='display:flex; flex-direction:column; gap:16px;'>" +
      "<div class='panel' style='border-left:4px solid #f59e0b;'>" +
        "<div class='panel-heading'><div><span class='section-index' style='color:#d97706;'>DEWAN JURI / GOD-MODE</span><h2>Simulator Intervensi Cepat</h2></div>" + simulationTag("GOD-MODE") + "</div>" +
        (selected ? "<div style='color:var(--muted); font-size:0.88rem; margin-bottom:12px;'><strong>" + esc(selected.title) + "</strong><br>" + statusBadge(batchStatus(selected)) + "</div>" +
        "<form data-form='temperature' data-id='" + esc(selected.id) + "' style='margin-bottom:16px;'><label style='font-weight:600;'>Override Suhu Lingkungan <output data-temperature-output style='color:var(--primary); font-weight:700;'>" + temp + "°C</output><input type='range' name='temperature' min='20' max='42' value='" + temp + "' style='width:100%; accent-color:#0b7a6b;'></label><button class='button button--outline' style='margin-top:8px; width:100%;' type='submit'>Terapkan Suhu ke Backend</button></form>" +
        "<div style='display:flex; flex-direction:column; gap:8px;'>" +
          "<button class='button button--danger' type='button' data-action='advance-tier' data-id='" + esc(selected.id) + "' data-target='TIER_2_ANIMAL_ACTIVE' style='font-size:0.82rem;'>⚡ TRIGGER INSTANT SPOILAGE (TIER 2)</button>" +
          "<button class='button button--warning' type='button' data-action='advance-tier' data-id='" + esc(selected.id) + "' data-target='TIER_3_COMPOST_ACTIVE' style='font-size:0.82rem;'>⚡ TRIGGER COMPOST DECAY (TIER 3)</button>" +
        "</div>" : "<p class='muted'>Tidak ada batch aktif untuk disimulasikan.</p>") +
      "</div>" +
      "<div class='panel'>" +
        "<div class='panel-heading'><div><span class='section-index'>GATEWAY EVENT FEED</span><h2>Live Mutation Stream</h2></div></div>" +
        activityList(state.auditLog.slice(0, 5)) +
      "</div>" +
    "</div>";
  } else {
    // ESG_AUDITOR
    rightSidebarCol = "<div class='command-side-wrap' style='display:flex; flex-direction:column; gap:16px;'>" +
      "<div class='panel' style='border-left:4px solid #10b981;'>" +
        "<div class='panel-heading'><div><span class='section-index' style='color:#059669;'>AUDIT EMISI RESMI</span><h2>Mitigasi Karbon Kota</h2></div></div>" +
        "<div style='display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;'>" +
          "<div style='background:#f1f5f9; padding:10px; border-radius:6px;'><small style='color:var(--muted);'>Reduksi CO₂e</small><br><strong style='color:#059669; font-size:1.15rem;'>" + co2e + " kg</strong></div>" +
          "<div style='background:#f1f5f9; padding:10px; border-radius:6px;'><small style='color:var(--muted);'>Mitigasi Metana (CH₄)</small><br><strong style='color:#0284c7; font-size:1.15rem;'>" + ch4 + " kg</strong></div>" +
        "</div>" +
        "<a class='button button--outline' style='width:100%; text-align:center;' href='/legal-vault'>" + icon("shield", 15) + " Buka Legal Vault Sertifikat</a>" +
      "</div>" +
      "<div class='panel'>" +
        "<div class='panel-heading'><div><span class='section-index'>LOG SERAH-TERIMA</span><h2>Verifikasi Terkini</h2></div></div>" +
        activityList(state.auditLog.slice(0, 5)) +
      "</div>" +
    "</div>";
  }

  const splitGrid = "<div class='command-center-split' style='display:grid; grid-template-columns: 1.6fr 1fr; gap:20px; margin-top:20px;'>" + leftMapCol + rightSidebarCol + "</div>";
  const footerBar = "<div class='stats-grid' style='margin-top:20px;'>" +
    statCard(money(totalPortions) + " porsi", "Porsi Terselamatkan", "Manusia & Pakan Ternak", "users") +
    statCard(Number(totalKg).toFixed(1) + " kg", "Biomassa Pangan Diselamatkan", "Mencegah pembusukan anaerobik", "box") +
    statCard(co2e + " kg", "Emisi CO₂e Dihindari", "Faktor IPCC 2.5× biomassa", "chart") +
    statCard("Rp " + money(Number(totalKg) * 3800), "Efisiensi Pakan Ternak", "Penghematan biaya peternak", "heart") +
  "</div>";

  return heading + splitGrid + footerBar;
}

function activityList(rows) {
  if (!rows.length) return "<p class='muted'>Belum ada aktivitas tercatat.</p>";
  return "<ol class='activity-list'>" + rows.map((row) => "<li><span class='activity-mark'>" + icon(row.newState === "COMPLETED" ? "check" : "refresh", 15) + "</span><div><strong>" + esc(row.batchName) + "</strong><p>" + esc(stateLabels[row.newState] || row.newState) + " · " + esc(row.actor) + "</p><small>" + esc(dateTime(row.createdAt)) + " · " + esc(row.source) + "</small></div></li>").join("") + "</ol>";
}

function filtersForm(route, categories) {
  const search = route.query.get("q") || "";
  const category = route.query.get("category") || "";
  const area = route.query.get("area") || "";
  return "<form class='filter-bar' data-form='filters'><label class='search-field'>" + icon("search") + "<span class='sr-only'>Cari makanan atau donor</span><input name='q' type='search' placeholder='Cari makanan atau donor' value='" + esc(search) + "'></label><label><span class='sr-only'>Kategori</span><select name='category'><option value=''>Semua kategori</option>" + categories.map((item) => "<option value='" + esc(item) + "'" + (item === category ? " selected" : "") + ">" + esc(item) + "</option>").join("") + "</select></label><label><span class='sr-only'>Wilayah</span><input name='area' placeholder='Wilayah umum' value='" + esc(area) + "'></label><button class='button button--primary' type='submit'>" + icon("search", 16) + " Cari</button></form>";
}

function foodBatchPage(route, state) {
  const role = state.activeRole;
  const all = (role === "ESG_AUDITOR" || role === "SIMULATOR_ADMIN") ? state.batches : roleBatches(role, state);
  const q = (route.query.get("q") || "").toLowerCase();
  const category = route.query.get("category") || "";
  const area = (route.query.get("area") || "").toLowerCase();
  const filtered = all.filter((item) =>
    (!q || (item.title + " " + item.donor).toLowerCase().includes(q)) &&
    (!category || item.category === category) &&
    (!area || item.area.toLowerCase().includes(area))
  );
  const title = role === "TIER_1_HUB" ? "Radar Pangan Layak Konsumsi (Tier 1)" : role === "TIER_2_FARMER" ? "Radar Biomassa Pakan Ternak (Tier 2)" : role === "TIER_3_COMPOST" ? "Residu Kompos Organik (Tier 3)" : "Radar Pangan Kota Bandung";
  const actions = role === "DONOR" ? "<a class='button button--primary' href='/batches/new'>" + icon("camera", 17) + " Zero-Click Ingesti</a>" : "";
  const view = route.query.get("view") || "list";
  const viewActions = "<div class='view-switch' role='group' aria-label='Tampilan batch'><a class='" + (view === "list" ? "is-active" : "") + "' href='/dashboard/food-batches?view=list'>" + icon("box", 15) + " Daftar</a><a class='" + (view === "map" ? "is-active" : "") + "' href='/dashboard/food-batches?view=map'>" + icon("map", 15) + " Radar Peta</a></div>";
  return pageTitle("RADAR SPASIAL POSTGIS", title, "Posisi koordinat publik disamarkan dalam radius 1.500m. Titik bongkar muat presisi hanya dibuka setelah klaim.", actions) +
    "<div class='notice notice--info'>" + icon("shield") + "<span>Model Arrhenius Q₁₀ memantau batas mikrobiologis secara real-time. Klaim segera sebelum batas kadaluwarsa terlewati.</span></div>" +
    filtersForm(route, CATEGORY_OPTIONS) + viewActions + (view === "map" ? mapSketch(filtered) : (role === "DONOR" || role === "ESG_AUDITOR" || role === "SIMULATOR_ADMIN" ? "<section class='panel'>" + batchTable(filtered) + "</section>" : batchGrid(filtered)));
}

function detailPage(route, state, edit) {
  const item = state.batches.find((batchItem) => batchItem.id === route.id);
  if (!item) return pageTitle("DETAIL BATCH", "Batch Tidak Ditemukan", "Data batch mungkin telah diperbarui.") + emptyState("Tidak ada batch dengan ID ini.", "Kembali ke radar pangan.", "<a class='button button--outline' href='/dashboard/food-batches'>Kembali ke Radar</a>");
  const role = state.activeRole;
  const isOwner = item.donorId === state.activeActorId && role === "DONOR";
  const canClaim = !item.claim && ((role === "TIER_1_HUB" && item.state === "TIER_1_HUMAN_ACTIVE") ||
    (role === "TIER_2_FARMER" && item.state === "TIER_2_ANIMAL_ACTIVE") ||
    (role === "TIER_3_COMPOST" && item.state === "TIER_3_COMPOST_ACTIVE"));
  const exact = item.claim && item.claim.actorId === state.activeActorId;
  if (edit && !isOwner) return pageTitle("BATCH", "Akses Tidak Tersedia", "Hanya donatur pemilik yang dapat mengubah informasi batch.");

  const action = isOwner && item.state === "TIER_1_HUMAN_ACTIVE" && !item.claim
    ? "<button class='button button--danger-quiet' type='button' data-action='cancel-batch' data-id='" + esc(item.id) + "'>Batalkan Batch</button>"
    : canClaim ? "<button class='button button--primary button--large' type='button' data-action='claim-batch' data-id='" + esc(item.id) + "'>" + icon("zap", 18) + " Ambil Misi Penyelamatan (Atomic Lock)</button>"
    : isOwner && item.claim ? "<button class='button button--primary button--large' type='button' data-action='handover' data-id='" + esc(item.id) + "'>" + icon("qr", 18) + " Verifikasi Serah-Terima (Scan QR)</button>" : "";

  if (edit) return editBatchForm(item);

  const privacy = exact
    ? "<div class='detail-row' style='background:rgba(11,122,107,0.06); padding:8px 12px; border-radius:6px;'><span>Titik Jemput Presisi (Loading Dock)</span><strong style='color:#0b7a6b;'>" + esc(item.exactPickupLocation ? (item.address_full || item.area) + " (Lat: " + item.exactPickupLocation.latitude + ", Lng: " + item.exactPickupLocation.longitude + ")" : "Pintu Belakang Loading Dock Sayap Barat") + (item.handover_point_notes ? "<br><small style='color:#0b7a6b;'>Catatan Akses: " + esc(item.handover_point_notes) + "</small>" : "") + "</strong></div>"
    : "<div class='detail-row'><span>Wilayah Radar (Geospatial Obfuscation)</span><strong>" + esc(item.area) + " (Radius ripple: " + esc(item.rippleRadiusM || 1500) + "m)</strong></div>";

  const safeWindowRow = "<div class='detail-row'><span>Jendela Aman Konsumsi (Arrhenius Q₁₀)</span><strong>" + bioCountdownBadge(item) + " (Suhu Ambien: " + esc(item.temperatureC) + "°C)</strong></div>";
  const containerRow = item.recommendedContainer ? "<div class='detail-row'><span>Rekomendasi Wadah Logistik</span><strong style='color:#0b7a6b;'>📦 " + esc(item.recommendedContainer) + "</strong></div>" : "";

  // Dynamic QR Code Display for Claimant (Tier 1 Hub / Tier 2 Farmer / Tier 3 Compost)
  const tokenPanel = exact && item.state !== "COMPLETED" ?
    "<section class='panel handover-panel dynamic-qr-box' style='background:#f5faf9; border:2px dashed #0b7a6b; padding:20px; border-radius:12px; text-align:center; margin-top:20px;'>" +
      "<span class='section-index' style='color:#0b7a6b;'>DYNAMIC QR CODE (HMAC-SHA256)</span>" +
      "<h2 style='margin:4px 0 8px;'>Tunjukkan Kode Ini Saat Pengambilan</h2>" +
      "<p class='muted' style='margin-bottom:12px;'>Kunci kriptografis serah-terima satu kali pakai bertanda waktu. Berlaku 60 menit.</p>" +
      "<div class='dynamic-token-display' style='font-family:monospace; font-size:2rem; font-weight:800; letter-spacing:4px; color:#0b7a6b; background:#fff; padding:12px 24px; border-radius:8px; display:inline-block; border:1px solid #ccebe5; margin-bottom:12px;'>" +
        esc(item.claim.token) +
      "</div>" +
      "<div><button class='button button--outline' type='button' data-action='copy-token' data-token='" + esc(item.claim.token) + "'>" + icon("check", 15) + " Salin Token</button></div>" +
    "</section>" : "";

  // Official Digital Liability Waiver Seal for COMPLETED Batch
  const waiverCertPanel = item.state === "COMPLETED" ?
    "<section class='panel waiver-card' style='background:linear-gradient(135deg, #f0fdf4 0%, #e6f7f4 100%); border:2px solid #10b981; padding:24px; border-radius:12px; margin-top:20px;'>" +
      "<div style='display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;'>" +
        "<div>" +
          "<span class='section-index' style='color:#059669;'>DIGITAL LIABILITY WAIVER CERTIFICATE</span>" +
          "<h2 style='color:#065f46; margin:4px 0;'>Sertifikat Bebas Tuntutan Hukum</h2>" +
          "<p style='color:#047857; margin:0; font-size:0.88rem;'>Perlindungan Penuh di Bawah Doktrin Good Samaritan Law</p>" +
        "</div>" +
        "<div class='waiver-seal' style='background:#059669; color:#fff; padding:6px 14px; border-radius:20px; font-weight:700; font-size:0.75rem; letter-spacing:1px;'>" +
          "SAFE HARBOR VERIFIED" +
        "</div>" +
      "</div>" +
      "<div style='display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.88rem;'>" +
        "<div><span style='color:#047857;'>No. Sertifikat:</span><br><strong style='font-family:monospace; font-size:1.05rem; color:#065f46;'>" + esc(item.claim?.waiverCertificateNo || "SRK-ESG-" + item.id.slice(0, 8)) + "</strong></div>" +
        "<div><span style='color:#047857;'>Jalur Penyelamatan:</span><br><strong style='color:#065f46;'>" + esc(item.completedTier || "Tier 1: Konsumsi Manusia") + "</strong></div>" +
        "<div><span style='color:#047857;'>Biomassa Terselamatkan:</span><br><strong style='color:#065f46;'>" + esc(item.weightKg) + " kg (" + esc(item.portions) + " porsi)</strong></div>" +
        "<div><span style='color:#047857;'>Mitigasi Emisi Karbon:</span><br><strong style='color:#059669; font-weight:700;'>" + (item.weightKg * 2.5).toFixed(1) + " kg CO₂e avoided</strong></div>" +
      "</div>" +
      "<div style='margin-top:12px; padding-top:12px; border-top:1px dashed #a7f3d0; font-size:0.75rem; color:#065f46; font-family:monospace; word-break:break-all;'>" +
        "Signature Hash (SHA-256): " + esc(item.claim?.waiverHash || "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069") +
      "</div>" +
    "</section>" : "";

  return pageTitle("DETAIL BATCH PENYELAMATAN", item.title, "Rincian batch makanan dengan telemetri degradasi mikrobiologis dan perlindungan hukum.", "") +
    "<div class='detail-layout'><div class='detail-main'>" + photo(item.scene, item.title, item.photoData) +
    "<section class='panel detail-info'><div class='panel-heading'><div><span class='section-index'>RINGKASAN MAKANAN</span><h2>" + esc(item.title) + "</h2></div>" + simulationTag("BIO-THERMAL GUARD") + "</div>" +
    "<p>" + esc(item.description || "Batch penyelamatan pangan teruji melalui AI Vision & Bio-Thermal Arrhenius Q₁₀.") + "</p>" +
    "<div class='detail-rows'>" +
      "<div class='detail-row'><span>Kategori Risiko</span><strong>" + esc(item.category) + "</strong></div>" +
      "<div class='detail-row'><span>Kuantitas Makanan</span><strong>" + esc(money(item.portions)) + " porsi · " + esc(money(item.weightKg)) + " kg</strong></div>" +
      "<div class='detail-row'><span>Donatur Pangan</span><strong>" + esc(item.donor) + "</strong></div>" +
      privacy + safeWindowRow + containerRow +
      "<div class='detail-row'><span>Waktu Penyajian</span><strong>" + esc(dateTime(item.preparedAt)) + "</strong></div>" +
      "<div class='detail-row'><span>Kondisi Penyimpanan</span><strong>" + esc(item.storageCondition) + "</strong></div>" +
      "<div class='detail-row'><span>Batas Tier 1 (Manusia)</span><strong>" + esc(dateTime(item.tier1ExpiresAt || item.claimDeadline)) + "</strong></div>" +
      "<div class='detail-row'><span>Batas Tier 2 (Pakan)</span><strong>" + esc(dateTime(item.tier2ExpiresAt)) + "</strong></div>" +
    "</div>" +
    "<div class='status-summary' style='margin-top:16px;'>" + statusBadge(batchStatus(item)) + "<p>" + esc(stateLabels[batchStatus(item)]) + "</p></div>" +
    "<div class='detail-actions' style='margin-top:16px;'>" + action + "</div>" +
    "</section>" +
    tokenPanel + waiverCertPanel +
    "</div>" +
    "<aside class='detail-side'>" +
      "<section class='panel'><span class='section-index'>SAFETY INVARIANT PROTOCOL</span><h3>Standar Keselamatan Pangan</h3><p>Model matematika Arrhenius Q₁₀ memonitor keamanan mikrobiologis. Jika penyerahan terlambat melewati batas Tier 1, backend secara mutlak menolak verifikasi (HTTP 422) dan mengalihkan batch ke Tier 2 (Pakan Ternak).</p></section>" +
      "<section class='panel'><span class='section-index'>PIRAMIDA PENYELAMATAN</span><h3>Alur Multi-Tier Otomatis</h3><ol class='mini-timeline'><li class='is-current'>Tier 1: Konsumsi Manusia (0 &ndash; t_safe)</li><li>Tier 2: Pakan Ternak Maggot BSF & Unggas (t_safe + 12h)</li><li>Tier 3: Kompos Regeneratif & Pencegahan Metana</li></ol></section>" +
    "</aside></div>";
}

function newBatchForm() {
  return "<form class='form-card zero-click-card' data-form='new-batch' novalidate>" +
    "<div class='form-section'>" +
      "<span class='section-index'>01 / ZERO-CLICK VISION AI</span>" +
      "<h2>Foto Makanan Berlebih</h2>" +
      "<p class='muted'>Cukup unggah foto sisa makanan prasmanan atau katering. AI Gemini 2.5 Flash akan mengekstrak nama menu, estimasi porsi, berat (kg), kategori risiko mikrobiologis, dan rekomendasi wadah logistik secara otomatis (&le; 15 detik).</p>" +
      "<label class='upload-area zero-click-upload' for='food-photo' style='border:2px dashed #0b7a6b; background:rgba(11,122,107,0.03); cursor:pointer;'>" +
        "<span class='upload-icon' style='color:#0b7a6b;'>" + icon("camera", 32) + "</span>" +
        "<strong>Ambil / Pilih Foto Makanan Prasmanan</strong>" +
        "<small>JPG, PNG, WebP · Maksimal 5 MB</small>" +
        "<input id='food-photo' type='file' name='photoFile' accept='image/jpeg,image/png,image/webp' required>" +
      "</label>" +
      "<div class='photo-preview' data-photo-preview hidden style='margin-top:12px;'></div>" +
    "</div>" +
    "<div class='form-section'>" +
      "<span class='section-index'>02 / PARAMETER BIO-THERMAL LINGKUNGAN</span>" +
      "<h2>Durasi Paparan & Suhu Ruangan</h2>" +
      "<div class='exposure-slider-wrap' style='margin-bottom:20px;'>" +
        "<label style='font-weight:600; display:block; margin-bottom:8px;'>Waktu Makanan Berada di Meja Prasmanan (Exposure Time)</label>" +
        "<div style='display:flex; justify-content:space-between; font-size:0.85rem; color:#64748b; margin-bottom:4px;'>" +
          "<span>0m (Baru Matang)</span><span>120m (≤ 2 Jam)</span><span>240m (≤ 4 Jam)</span>" +
        "</div>" +
        "<input type='range' name='exposedMinutes' min='0' max='240' step='120' value='0' style='width:100%; accent-color:#0b7a6b;'>" +
      "</div>" +
      "<div class='toggle-switch-label' style='display:flex; align-items:center; justify-content:space-between; background:#f8fafc; padding:12px 16px; border-radius:8px; border:1px solid #e2e8f0;'>" +
        "<div><strong>Kondisi Ruangan Ber-AC?</strong><br><small class='muted'>AC aktif menyetel suhu awal ke 22°C (memperpanjang daya simpan Arrhenius Q₁₀).</small></div>" +
        "<input type='checkbox' name='isAcRoom' value='yes' style='width:20px; height:20px; accent-color:#0b7a6b; cursor:pointer;'>" +
      "</div>" +
    "</div>" +
    "<div class='form-section'>" +
      "<span class='section-index'>03 / RILIS KE RADAR SPASIAL</span>" +
      "<h2>Konfirmasi & Rilis Pangan</h2>" +
      "<label class='check-label check-label--block' style='margin-bottom:16px;'>" +
        "<input type='checkbox' name='donorReviewed' value='yes' required checked>" +
        "<span>Saya menyetujui penerbitan batch ke radar simpul terdekat dan pelepasan tanggung jawab hukum melalui Good Samaritan Digital Liability Waiver saat serah-terima.</span>" +
      "</label>" +
      "<p class='safety-note'>" + icon("shield", 16) + "<span>AI Gemini 2.5 Flash dan Bio-Thermal SDK secara otomatis menentukan jendela batas aman konsumsi.</span></p>" +
      "<p class='form-error' data-form-error hidden></p>" +
      "<div class='form-actions'>" +
        "<a class='button button--outline' href='/dashboard'>Batal</a>" +
        "<button class='button button--primary button--large' type='submit'>" + icon("zap", 18) + " ⚡ Analisis & Rilis Batch via AI (Zero-Click)</button>" +
      "</div>" +
    "</div>" +
  "</form>";
}

function editBatchForm(item) {
  return pageTitle("EDIT BATCH", "Perbarui Informasi", "Batch aktif milik Anda.") +
    "<form class='form-card' data-form='edit-batch' data-id='" + esc(item.id) + "' novalidate><div class='form-section'><label>Nama Makanan<input name='title' required value='" + esc(item.title) + "'></label><label>Kategori Risiko<select name='category'>" + FOOD_CATEGORY_OPTIONS.map((value) => "<option" + (item.category === value ? " selected" : "") + ">" + esc(value) + "</option>").join("") + "</select></label><div class='form-grid'><label>Jumlah Porsi<input type='number' name='portions' min='1' required value='" + esc(item.portions) + "'></label><label>Berat Total (kg)<input type='number' name='weightKg' min='0.1' step='0.1' required value='" + esc(item.weightKg) + "'></label></div><label>Kondisi Penyimpanan<input name='storageCondition' required value='" + esc(item.storageCondition) + "'></label><label>Catatan Wadah & Alergen<textarea name='allergenNotes' rows='2'>" + esc(item.allergenNotes) + "</textarea></label><label>Batas Klaim Operasional<input type='datetime-local' name='claimDeadline' value='" + esc(new Date(item.claimDeadline).toISOString().slice(0, 16)) + "' required></label><label class='check-label check-label--block'><input type='checkbox' name='donorReviewed' required checked><span>Saya meninjau ulang informasi donasi makanan.</span></label><p class='form-error' data-form-error hidden></p><div class='form-actions'><a class='button button--outline' href='/batches/" + encodeURIComponent(item.id) + "'>Kembali</a><button class='button button--primary' type='submit'>Simpan Perubahan</button></div></div></form>";
}

function missionsPage(state) {
  const actorId = state.activeActorId;
  const missions = state.batches.filter((item) => item.claim?.actorId === actorId || (state.activeRole === "DONOR" && item.donorId === actorId && item.claim));
  const content = missions.length ? "<div class='batch-grid'>" + missions.map((item) => foodCard(item, "Buka Handshake QR")).join("") + "</div>" : emptyState("Belum ada misi aktif", "Klaim batch dari radar spasial untuk memulai misi penyelamatan pangan.", "<a class='button button--outline' href='/dashboard/food-batches'>Buka Radar Pangan</a>");
  return pageTitle("MISI & RIWAYAT PENYELAMATAN", "Perjalanan Serah-Terima Pangan", "Daftar batch yang Anda klaim dan status serah-terima loading dock.") + content + "<section class='panel' style='margin-top:24px;'><div class='panel-heading'><div><span class='section-index'>HISTORI AUDIT</span><h2>Log Mutasi Batch Anda</h2></div></div>" + activityList(state.auditLog.filter((row) => missions.some((item) => item.id === row.batchId)).slice(0, 8)) + "</section>";
}

function analyticsPage(state) {
  const esg = state.esgSummary || {};
  const completed = state.batches.filter((item) => item.state === "COMPLETED");
  const portions = esg.total_portions_saved ?? completed.reduce((sum, item) => sum + (item.portions || 0), 0);
  const kg = esg.total_weight_saved_kg ?? completed.reduce((sum, item) => sum + (item.weightKg || 0), 0);
  const co2e = esg.co2e_avoided_kg ?? (Number(kg) * 2.5).toFixed(1);
  const ch4 = esg.methane_ch4_avoided_kg ?? (Number(kg) * 0.15).toFixed(2);
  const feedSavings = esg.estimated_feed_savings_idr ? "Rp " + money(esg.estimated_feed_savings_idr) : "Rp " + money(Number(kg) * 3800);
  const tiers = [
    esg.rescued_by_tier?.TIER_1_HUMAN ?? completed.filter((item) => item.completedTier === "TIER_1_HUMAN").length,
    esg.rescued_by_tier?.TIER_2_ANIMAL ?? completed.filter((item) => item.completedTier === "TIER_2_ANIMAL").length,
    esg.rescued_by_tier?.TIER_3_COMPOST ?? completed.filter((item) => item.completedTier === "TIER_3_COMPOST").length
  ];
  return pageTitle("ESG & CARBON ANALYTICS", "Telemetri Dampak Lingkungan & Emisi", "Audit emisi metana (CH₄), reduksi CO₂e avoided, dan efisiensi sirkular pangan Kota Bandung.") +
    "<div class='stats-grid'>" +
      statCard(money(portions) + " porsi", "Porsi Terselamatkan", "Konsumsi manusia & ternak", "users") +
      statCard(Number(kg).toFixed(1) + " kg", "Biomassa Pangan Diselamatkan", "Mencegah landfill anaerobik", "box") +
      statCard(Number(co2e).toFixed(1) + " kg", "Emisi CO₂e Dihindari", "Faktor IPCC 2.5× biomassa", "chart") +
      statCard(feedSavings, "Efisiensi Pakan Ternak", "Penghematan pakan peternak (Rp 3.800/kg)", "heart") +
    "</div>" +
    "<div class='dashboard-grid'><section class='panel'><div class='panel-heading'><div><span class='section-index'>DISTRIBUSI PIRAMIDA PENYELAMATAN</span><h2>Batch Terselamatkan per Jalur</h2></div></div><div class='tier-metrics'><div><span>Tier 1 · Manusia (Prioritas)</span><strong>" + tiers[0] + "</strong><div class='bar'><i style='width:" + Math.max(tiers[0] * 25, 7) + "%'></i></div></div><div><span>Tier 2 · Pakan Ternak / Maggot</span><strong>" + tiers[1] + "</strong><div class='bar bar--amber'><i style='width:" + Math.max(tiers[1] * 25, 7) + "%'></i></div></div><div><span>Tier 3 · Kompos Organik</span><strong>" + tiers[2] + "</strong><div class='bar bar--rust'><i style='width:" + Math.max(tiers[2] * 25, 7) + "%'></i></div></div></div></section><section class='panel'><div class='panel-heading'><div><span class='section-index'>AUDIT TRAIL</span><h2>Log Verifikasi Serah-Terima</h2></div></div>" + activityList(state.auditLog.slice(0, 6)) + "</section></div>";
}

function directoryPage(route, state, donors) {
  const rows = state.actors.filter((actor) => donors ? actor.roles.includes("DONOR") : actor.roles.some((role) => ["TIER_1_HUB", "TIER_2_FARMER", "TIER_3_COMPOST"].includes(role)));
  return pageTitle("DIREKTORI EKOSISTEM", donors ? "Donor Pangan Terdaftar" : "Simpul Komunitas & Pengelola Pakan/Kompos", "Daftar mitra terverifikasi dalam ekosistem penyelamatan pangan Kota Bandung.") +
    "<section class='panel'>" + (rows.length ? "<div class='table-wrap'><table><thead><tr><th>Instansi / Usaha</th><th>Peran</th><th>Wilayah Operasional</th><th>Status Verifikasi</th></tr></thead><tbody>" + rows.map((actor) => "<tr><td><strong>" + esc(actor.businessName) + "</strong><br><small style='color:#64748b;'>" + esc(actor.name) + " (" + esc(actor.email) + ")</small></td><td>" + actor.roles.map((role) => "<span class='role-pill'>" + esc(ROLES[role].label) + "</span>").join(" ") + "</td><td>" + esc(actor.area) + "</td><td>" + (actor.verified ? "<span style='color:#10b981; font-weight:600;'>✓ Terverifikasi DLH</span>" : "Dalam Peninjauan") + "</td></tr>").join("") + "</tbody></table></div>" : emptyState("Belum ada mitra terdaftar", "Mitra yang terdaftar akan muncul di sini.")) + "</section>";
}

function legalVaultPage(state) {
  const completed = state.batches.filter((item) => item.state === "COMPLETED");
  const recentWaivers = state.esgSummary?.recent_waiver_certificates || [];
  const rows = recentWaivers.length ? recentWaivers.map((w) => "<tr><td><strong>" + esc(w.waiver_certificate_no) + "</strong><br><small style='font-family:monospace; color:#0b7a6b;'>SHA-256: " + esc((w.waiver_signature_hash || "").slice(0, 16)) + "…</small></td><td>" + esc(w.donor_name) + "</td><td>" + esc(w.receiver_name) + "</td><td>" + esc(w.final_rescued_tier) + "</td><td><strong>" + esc(w.weight_saved_kg) + " kg</strong> (" + esc(w.portions_saved) + " porsi)</td><td><span style='color:#10b981; font-weight:600;'>" + esc(w.co2e_avoided_kg) + " kg CO₂e</span></td><td>" + esc(dateTime(w.recorded_at)) + "</td></tr>").join("") : completed.map((item) => "<tr><td><strong>" + esc(item.claim?.waiverCertificateNo || "SRK-ESG-" + item.id.slice(0, 8)) + "</strong><br><small style='font-family:monospace; color:#0b7a6b;'>SHA-256: " + esc((item.claim?.waiverHash || "7f83b165").slice(0, 16)) + "…</small></td><td>" + esc(item.donor) + "</td><td>" + esc(item.claim?.actorName || "Simpul Komunitas") + "</td><td>" + esc(item.completedTier || "TIER_1_HUMAN") + "</td><td><strong>" + esc(item.weightKg) + " kg</strong> (" + esc(item.portions) + " porsi)</td><td><span style='color:#10b981; font-weight:600;'>" + (item.weightKg * 2.5).toFixed(1) + " kg CO₂e</span></td><td>" + esc(dateTime(item.claim?.completedAt || item.createdAt)) + "</td></tr>").join("");
  return pageTitle("DIGITAL LIABILITY VAULT", "Sertifikat Bebas Tuntutan Hukum (Safe Harbor)", "Arsip digital sertifikat pembebasan tanggung jawab hukum donatur makanan berlebih dan verifikasi audit ESG.") +
    "<div class='notice notice--info'>" + icon("shield") + "<span>Klausul Good Samaritan & Perlindungan Hukum: Setiap sertifikat diterbitkan otomatis saat verifikasi serah-terima HMAC-SHA256 valid sebelum batas bio-thermal Arrhenius kedaluwarsa.</span></div>" +
    "<section class='panel'><div class='panel-heading'><div><span class='section-index'>SERTIFIKAT BEBAS TUNTUTAN HUKUM</span><h2>Arsip Sertifikat Terbit</h2></div><button class='button button--outline' type='button' data-action='print-report'>" + icon("box", 15) + " Cetak / Simpan PDF</button></div>" +
    (rows ? "<div class='table-wrap'><table><thead><tr><th>No. Sertifikat & Hash</th><th>Donor</th><th>Penerima</th><th>Tier Akhir</th><th>Biomassa</th><th>CO₂e Avoided</th><th>Waktu Penerbitan</th></tr></thead><tbody>" + rows + "</tbody></table></div>" : emptyState("Belum ada sertifikat terbit", "Konfirmasi serah-terima pada batch untuk menerbitkan sertifikat.")) + "</section>";
}

function simulationPage(route, state) {
  const batches = state.batches.filter((item) => !["COMPLETED", "CANCELLED_BY_DONOR"].includes(item.state));
  const requested = route.query?.get("batch");
  const selected = batches.find((item) => item.id === requested) || batches[0];
  const batchOptions = batches.map((item) => "<option value='" + esc(item.id) + "'" + (item.id === selected?.id ? " selected" : "") + ">" + esc(item.title) + " · " + esc(stateLabels[batchStatus(item)]) + "</option>").join("");
  const temp = selected?.temperatureC || 29;
  const q10Factor = Math.pow(2.2, (temp - 25) / 10).toFixed(2);
  return pageTitle("GOD-MODE SIMULATOR", "Pengendali Telemetri & Time-Warp", "Uji coba degradasi bio-thermal Arrhenius Q₁₀ dan Safety Invariant Enforcer.") +
    "<div class='notice notice--warning'>" + icon("info") + "<span><strong>GOD-MODE ACTIVE.</strong> Kontrol ini mengirim instruksi langsung ke <code>POST /api/v1/simulation/time-warp</code> pada backend engine.</span></div>" +
    (selected ? "<div class='simulation-layout'><section class='panel simulation-controls'><form data-form='simulation-select'><label>Pilih batch aktif<select name='batch'>" + batchOptions + "</select></label></form><div class='panel-heading'><div><span class='section-index'>BATCH TERPILIH</span><h2>" + esc(selected.title) + "</h2></div>" + simulationTag("GOD-MODE") + "</div>" + statusBadge(batchStatus(selected)) + "<p>" + esc(selected.donor) + " · " + esc(selected.area) + "</p>" +
    "<div class='bio-thermal-card' style='background:rgba(11,122,107,0.06); padding:12px; border-radius:8px; margin:12px 0; border-left:3px solid #0b7a6b;'><h4 style='margin:0 0 4px;'>Telemetri Arrhenius Q₁₀</h4><p style='margin:0; font-size:0.88rem;'>Suhu Ambient: <strong>" + temp + "°C</strong> | Faktor Laju Degradasi Q₁₀: <strong>" + q10Factor + "×</strong> | Jendela Aman Sisa: <strong>" + (selected.safeWindowMinutes || 180) + " menit</strong></p></div>" +
    "<form data-form='temperature' data-id='" + esc(selected.id) + "'><label>Override Suhu Lingkungan (°C) <output data-temperature-output>" + esc(temp) + "°C</output><input type='range' name='temperature' min='20' max='42' value='" + esc(temp) + "'></label><p class='form-hint'>Menggeser slider akan memicu rekalkulasi jendela aman pada backend melalui Arrhenius Q₁₀.</p><button class='button button--outline' type='submit'>Terapkan Suhu ke Backend</button></form>" +
    "<div class='next-transition' style='margin-top:20px;'><h3>Trigger Instan Bio-Thermal (Time-Warp)</h3><p>Paksa kedaluwarsa instan untuk menguji Safety Invariant Guard.</p><div style='display:flex; flex-direction:column; gap:8px;'>" +
    (selected.state.startsWith("TIER_1") ? "<button class='button button--danger' type='button' data-action='advance-tier' data-id='" + esc(selected.id) + "' data-target='TIER_2_ANIMAL_ACTIVE'>⚡ TRIGGER INSTANT BIO-THERMAL SPOILAGE (TIER 2)</button>" : "") +
    (selected.state.startsWith("TIER_2") ? "<button class='button button--warning' type='button' data-action='advance-tier' data-id='" + esc(selected.id) + "' data-target='TIER_3_COMPOST_ACTIVE'>⚡ TRIGGER INSTANT COMPOST DECAY (TIER 3)</button>" : "") +
    "</div></div></section><section class='panel'><div class='panel-heading'><div><span class='section-index'>EVENT LOG ENGINE</span><h2>Audit Trail Backend</h2></div></div>" + activityList(state.auditLog.filter((row) => row.batchId === selected.id).slice(0, 8)) + "</section></div>" : emptyState("Tidak ada batch aktif", "Buat batch donasi baru untuk melakukan simulasi.")) +
    "<div class='panel-footer'><button class='button button--quiet' type='button' data-action='reset-demo'>" + icon("refresh", 16) + " Reset Seluruh State Demo</button></div>";
}

function profilePage(state) {
  const actor = getCurrentActor();
  if (!actor) return "";
  const roleList = actor.roles.map((role) => "<span class='role-pill'>" + esc(ROLES[role].label) + "</span>").join(" ");
  const roleSwitch = actor.roles.length > 1 ? "<button class='button button--outline' type='button' data-action='switch-role'>Ganti peran</button>" : "<p class='form-hint'>Akun ini memiliki satu role utama terdaftar.</p>";
  return pageTitle("PROFIL PENGGUNA", "Informasi Akun & Hak Akses", "Pengaturan profil usaha dan hak akses peran.") +
    "<div class='profile-layout'><form class='panel form-section' data-form='profile'><span class='section-index'>IDENTITAS USAHA</span><label>Nama Penanggung Jawab<input name='name' required value='" + esc(actor.name) + "'></label><label>Nama Usaha / Komunitas<input name='businessName' required value='" + esc(actor.businessName) + "'></label><label>Nomor WhatsApp<input name='phone' value='" + esc(actor.phone) + "'></label><label>Alamat / Wilayah<input name='area' value='" + esc(actor.area) + "'></label><button class='button button--primary' type='submit'>Simpan Perubahan</button></form><div class='profile-side'><section class='panel'><span class='section-index'>PERAN DALAM SISTEM</span><h2>" + esc(ROLES[state.activeRole].label) + "</h2><div class='role-pills' style='margin-bottom:12px;'>" + roleList + "</div>" + roleSwitch + "</section><section class='panel'><span class='section-index'>STATUS VERIFIKASI</span><h2>" + (actor.verified ? "✓ Terverifikasi DLH & Sistem" : "Dalam Verifikasi") + "</h2><p>Identitas telah divalidasi untuk melakukan serah-terima pangan.</p></section><section class='panel'><span class='section-index'>SESI PENGGUNA</span><h2>Keluar Akun</h2><p>Pastikan Anda menyelesaikan serah-terima sebelum keluar.</p><button class='button button--danger-quiet' type='button' data-action='logout'>Keluar dari Akun</button></section></div></div>";
}

function dashboardPage(route, state) {
  const role = state.activeRole;
  if (route.name === "/dashboard") return overviewPage(role, state);
  if (route.name === "/dashboard/food-batches") return foodBatchPage(route, state);
  if (route.name === "/dashboard/donors") return directoryPage(route, state, true);
  if (route.name === "/dashboard/receivers") return directoryPage(route, state, false);
  if (route.name === "/dashboard/analytics") return analyticsPage(state);
  if (route.name === "/legal-vault") return legalVaultPage(state);
  if (route.name === "/simulation") return simulationPage(route, state);
  if (route.name === "/profile") return profilePage(state);
  if (route.name === "/missions") return missionsPage(state);
  if (route.name === "/batches/new") return pageTitle("ZERO-CLICK VISION AI", "Rilis Pangan Berlebih", "Unggah foto makanan. Gemini 2.5 Flash & Arrhenius Q₁₀ SDK mengekstrak porsi, berat, dan batas aman otomatis.", "") + newBatchForm();
  if (route.name === "batch-detail") return detailPage(route, state, false);
  if (route.name === "batch-edit") return detailPage(route, state, true);
  return pageTitle("RUANG KERJA", "Halaman Tidak Ditemukan", "Pilih menu pada navigasi untuk melanjutkan.") + emptyState("Route tidak dikenali.", "Pilih halaman dari navigasi.", "<a class='button button--outline' href='/dashboard'>Ke Dashboard</a>");
}

function accessError(message) {
  return "<main id='main' class='auth-page'><div class='auth-brand'>" + brand(false) + "</div><section class='auth-card'><span class='section-index'>AKSES SISTEM</span><h1>Sesi Diperlukan</h1><p>" + esc(message) + "</p><a class='button button--primary' href='/login'>Masuk ke Akun Anda</a></section></main>";
}

const protectedNames = new Set([
  "/dashboard", "/dashboard/food-batches", "/dashboard/donors", "/dashboard/receivers",
  "/dashboard/analytics", "/legal-vault", "/simulation", "/profile", "/missions",
  "/batches/new", "batch-detail", "batch-edit"
]);

export function render(route, state) {
  if (route.name === "/") {
    if (state.activeRole) return appShell(route, state, dashboardPage(route, state));
    return landing(state);
  }
  if (["/login", "/register", "/select-role"].includes(route.name)) {
    if (state.activeRole && route.name !== "/select-role") return appShell(route, state, dashboardPage(route, state));
    return authPage(route.name, state);
  }
  if (protectedNames.has(route.name) && !state.activeRole) return accessError("Sesi Anda belum aktif. Silakan masuk terlebih dahulu.");
  if (route.name === "/simulation" && state.activeRole !== "SIMULATOR_ADMIN") return accessError("Simulator hanya dapat diakses oleh dewan juri / SIMULATOR_ADMIN.");
  if (["/dashboard/donors", "/dashboard/receivers", "/dashboard/analytics", "/legal-vault"].includes(route.name) &&
      !["ESG_AUDITOR", "SIMULATOR_ADMIN"].includes(state.activeRole)) return accessError("Halaman ini hanya dapat diakses oleh Auditor ESG atau Administrator.");
  if (route.name === "/dashboard/food-batches" && state.activeRole === "TIER_3_COMPOST") return appShell(route, state, dashboardPage(route, state));
  if (protectedNames.has(route.name)) return appShell(route, state, dashboardPage(route, state));
  return landing(state);
}
