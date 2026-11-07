export const ROLES = {
  DONOR: {
    label: "Donor Pangan",
    short: "Donor",
    description: "Katering, restoran, bakery, hotel, dan warteg yang mendonasikan kelebihan pangan."
  },
  TIER_1_HUB: {
    label: "Simpul Komunitas",
    short: "Hub Tier 1",
    description: "Masjid, dapur umum, panti asuhan, dan posko siaga yang menyalurkan pangan layak konsumsi manusia."
  },
  TIER_2_FARMER: {
    label: "Pengelola Pakan Ternak",
    short: "Peternak Tier 2",
    description: "Peternak Maggot BSF, lele, dan unggas yang memanfaatkan biomassa pangan terdegradasi aman pakan."
  },
  TIER_3_COMPOST: {
    label: "Pengelola Kompos Organik",
    short: "Kompos Tier 3",
    description: "Bank sampah induk dan unit TPST/TPS3R pengolah residu organik menjadi kompos kota."
  },
  ESG_AUDITOR: {
    label: "Auditor Dampak ESG & DLH",
    short: "Auditor ESG",
    description: "Pemantau telemetri karbon CO₂e, mitigasi metana CH₄, dan sertifikat pembebasan tanggung jawab hukum."
  },
  SIMULATOR_ADMIN: {
    label: "Admin & Dewan Juri (God-Mode)",
    short: "Simulator",
    description: "Pengendali simulasi cuaca ekstrim, time-warp, dan pengujian protokol keselamatan pangan (Safety Invariant)."
  }
};

export const BUSINESS_ROLES = ["DONOR", "TIER_1_HUB", "TIER_2_FARMER", "TIER_3_COMPOST"];

export const BATCH_STATES = [
  "TIER_1_HUMAN_ACTIVE",
  "TIER_1_CLAIMED",
  "TIER_2_ANIMAL_ACTIVE",
  "TIER_2_CLAIMED",
  "TIER_3_COMPOST_ACTIVE",
  "COMPLETED",
  "CANCELLED_BY_DONOR"
];

export const FOOD_RISK_CATEGORIES = {
  WET_COCONUT_MILK: { label: "Santan Basah (Risiko Tinggi)", baseShelfLifeMin: 120, maxSafeTempC: 60 },
  WET_NON_COCONUT: { label: "Basah Non-Santan (Risiko Sedang)", baseShelfLifeMin: 180, maxSafeTempC: 60 },
  MOIST_PROTEIN_CARB: { label: "Protein & Karbo Lembap", baseShelfLifeMin: 240, maxSafeTempC: 60 },
  DRY_FRIED: { label: "Gorengan Kering", baseShelfLifeMin: 360, maxSafeTempC: 60 },
  BAKERY_PASTRY: { label: "Roti & Pastry", baseShelfLifeMin: 480, maxSafeTempC: 60 }
};

const ago = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
const future = (hours) => new Date(Date.now() + hours * 3600000).toISOString();

export const demoActors = [
  // 3 DONOR
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Sasana Budaya Ganesha (Sabuga) Convention Hall",
    businessName: "Sabuga ITB Catering",
    email: "catering@sabuga.itb.ac.id",
    phone: "+6281200000001",
    area: "Tamansari, Coblong, Kota Bandung",
    address_full: "Jl. Tamansari No.73, Lb. Siliwangi, Kecamatan Coblong, Kota Bandung",
    handover_point_notes: "Pintu Bongkar Muat Belakang Gedung Sabuga (Loading Dock Sayap Barat)",
    roles: ["DONOR"],
    verified: true,
    latitude: -6.8863,
    longitude: 107.6080
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Hotel Savoy Homann Asia Afrika",
    businessName: "Savoy Homann F&B",
    email: "fnb@savoyhomann.com",
    phone: "+6281200000002",
    area: "Asia Afrika, Lengkong, Kota Bandung",
    address_full: "Jl. Asia Afrika No.112, Cikawao, Kec. Lengkong, Kota Bandung",
    handover_point_notes: "Loading Dock Dapur Utama Lantai Basement 1",
    roles: ["DONOR"],
    verified: true,
    latitude: -6.9219,
    longitude: 107.6108
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Warteg Bahari Modern Dago",
    businessName: "Warteg Bahari Dago",
    email: "warteg.dago@gmail.com",
    phone: "+6281200000003",
    area: "Dago, Coblong, Kota Bandung",
    address_full: "Jl. Ir. H. Juanda No.142, Lebakgede, Coblong, Kota Bandung",
    handover_point_notes: "Pintu Dapur Samping Gang Senggol",
    roles: ["DONOR"],
    verified: true,
    latitude: -6.8920,
    longitude: 107.6145
  },

  // 4 TIER_1_HUB (Within 800m - 2500m of Sabuga & Dago)
  {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "DKM Masjid Al-Ukhuwah Balai Kota",
    businessName: "Posko Pangan Al-Ukhuwah",
    email: "marbot@alukhuwah-bandung.org",
    phone: "+6281200000011",
    area: "Wastukencana, Sumur Bandung, Kota Bandung",
    address_full: "Jl. Wastukencana No.27, Babakan Ciamis, Sumur Bandung, Kota Bandung",
    handover_point_notes: "Posko Relawan DKM Serambi Kanan",
    roles: ["TIER_1_HUB"],
    verified: true,
    latitude: -6.9115,
    longitude: 107.6095
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "Panti Asuhan Al-Fien Dago",
    businessName: "Dapur Asrama Al-Fien",
    email: "pengurus@pantialfien.org",
    phone: "+6281200000012",
    area: "Cisitu Indah, Dago, Kota Bandung",
    address_full: "Jl. Cisitu Indah VI No.12, Dago, Coblong, Kota Bandung",
    handover_point_notes: "Dapur Asrama Putra Lantai Dasar",
    roles: ["TIER_1_HUB"],
    verified: true,
    latitude: -6.8835,
    longitude: 107.6160
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "Dapur Komunitas Warga Tamansari",
    businessName: "Dapur Balai Warga RW 05",
    email: "dapur.tamansari@gmail.com",
    phone: "+6281200000013",
    area: "Tamansari Bawah, Bandung Wetan, Kota Bandung",
    address_full: "Jl. Tamansari Bawah No.45, Tamansari, Bandung Wetan, Kota Bandung",
    handover_point_notes: "Balai Warga RW 05 Tamansari",
    roles: ["TIER_1_HUB"],
    verified: true,
    latitude: -6.8980,
    longitude: 107.6065
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    name: "Posko Siaga Pangan RT 04 Sukajadi",
    businessName: "Posko Siaga Sukajadi",
    email: "posko.sukajadi@gmail.com",
    phone: "+6281200000014",
    area: "Sukajadi, Pasteur, Kota Bandung",
    address_full: "Jl. Sukajadi No.88, Pasteur, Sukajadi, Kota Bandung",
    handover_point_notes: "Pos Ronda Siaga RT 04",
    roles: ["TIER_1_HUB"],
    verified: true,
    latitude: -6.8910,
    longitude: 107.5950
  },

  // 3 TIER_2_FARMER (Biokonversi Maggot BSF, Budidaya Lele, Unggas Rakyat)
  {
    id: "c0000000-0000-0000-0000-000000000001",
    name: "Bio-Larva Maggot BSF Mandiri Cibiru",
    businessName: "Sentra Maggot Cibiru",
    email: "maggot.cibiru@gmail.com",
    phone: "+6281200000021",
    area: "Cilengkrang, Cibiru, Kota Bandung",
    address_full: "Jl. Cilengkrang 1 No.28, Cisurupan, Cibiru, Kota Bandung",
    handover_point_notes: "Fasilitas Biokonversi Maggot Kandang A",
    roles: ["TIER_2_FARMER"],
    verified: true,
    latitude: -6.9320,
    longitude: 107.7120
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    name: "Kolam Budidaya Lele Sangkuriang Kopo",
    businessName: "Budidaya Lele Sangkuriang",
    email: "lele.kopo@gmail.com",
    phone: "+6281200000022",
    area: "Kopo Cirangrang, Babakan Ciparay, Kota Bandung",
    address_full: "Jl. Kopo Cirangrang No.102, Babakan Ciparay, Kota Bandung",
    handover_point_notes: "Gudang Pengolahan Pakan Fermentasi Kolam 3",
    roles: ["TIER_2_FARMER"],
    verified: true,
    latitude: -6.9550,
    longitude: 107.5850
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    name: "Sentra Peternakan Unggas Rakyat Baleendah",
    businessName: "Peternakan Unggas Baleendah",
    email: "unggas.baleendah@gmail.com",
    phone: "+6281200000023",
    area: "Baleendah, Kab. Bandung",
    address_full: "Jl. Raya Banjaran No.54, Baleendah, Kab. Bandung",
    handover_point_notes: "Pintu Masuk Gerbang Timur Peternakan",
    roles: ["TIER_2_FARMER"],
    verified: true,
    latitude: -6.9980,
    longitude: 107.6250
  },

  // 1 TIER_3_COMPOST
  {
    id: "d0000000-0000-0000-0000-000000000001",
    name: "Bank Sampah Induk Bandung Bersih Babakan Siliwangi",
    businessName: "Bank Sampah Induk Baksil",
    email: "banksampah.baksil@bandung.go.id",
    phone: "+6281200000031",
    area: "Siliwangi, Coblong, Kota Bandung",
    address_full: "Jl. Siliwangi No.7, Lebak Siliwangi, Coblong, Kota Bandung",
    handover_point_notes: "Hanggar Komposter Organik Skala Kota",
    roles: ["TIER_3_COMPOST"],
    verified: true,
    latitude: -6.8830,
    longitude: 107.6090
  },

  // 1 ESG_AUDITOR
  {
    id: "e0000000-0000-0000-0000-000000000001",
    name: "Auditor Dampak ESG & DLH Kota Bandung",
    businessName: "ESG & DLH Audit Command Center",
    email: "auditor@dlh.bandung.go.id",
    phone: "+6281200000041",
    area: "Pusat Pemerintahan Kota Bandung",
    address_full: "Gedung Balai Kota Bandung, Jl. Wastukencana No.2",
    handover_point_notes: "Ruang Command Center Lingkungan Hidup",
    roles: ["ESG_AUDITOR"],
    verified: true,
    latitude: -6.9175,
    longitude: 107.6191
  },

  // 1 SIMULATOR_ADMIN (God-Mode)
  {
    id: "f0000000-0000-0000-0000-000000000001",
    name: "Dewan Juri & Technical Lead Hackathon",
    businessName: "Simulator Admin (God-Mode)",
    email: "admin@sirkula.ai",
    phone: "+6281200000051",
    area: "Ruang Penjurian Hackathon HIMTEC",
    address_full: "Auditorium Penjurian Inovasi Teknologi",
    handover_point_notes: "Konsol Admin Pengujian Sistem",
    roles: ["SIMULATOR_ADMIN"],
    verified: true,
    latitude: -6.9175,
    longitude: 107.6191
  }
];

function batch(id, donorId, donor, title, category, portions, weightKg, area, state, scene, hoursOld, tier2Reviewed, tier3Reviewed, completedTier, safeWindowMinutes, lat = -6.8863, lng = 107.6080) {
  return {
    id, donorId, donor, title, category, portions, weightKg, area, state, scene,
    latitude: lat,
    longitude: lng,
    obfuscatedLocation: {
      latitude: lat + (Math.random() - 0.5) * 0.004,
      longitude: lng + (Math.random() - 0.5) * 0.004
    },
    exactPickupLocation: { latitude: lat, longitude: lng },
    description: "Batch penyelamatan pangan teruji melalui AI Vision & Bio-Thermal Arrhenius Q₁₀.",
    preparedAt: ago(hoursOld),
    exposedMinutes: 25,
    storageCondition: "Tertutup, suhu ruang tropis (29°C)",
    allergenNotes: "Bebas bahan pengawet. Periksa alergen standar sebelum konsumsi.",
    claimDeadline: future(3),
    tier1ExpiresAt: future(2.5),
    tier2ExpiresAt: future(10),
    tier2Reviewed: Boolean(tier2Reviewed),
    tier3Reviewed: Boolean(tier3Reviewed),
    donorReviewed: true,
    completedTier: completedTier || null,
    temperatureC: 29,
    safeWindowMinutes: safeWindowMinutes || 150,
    rippleRadiusM: 1500,
    simulatedElapsedMinutes: 0,
    simulation: true,
    claim: null,
    createdAt: ago(hoursOld)
  };
}

export function createInitialState() {
  return {
    version: 4,
    activeRole: null,
    activeActorId: null,
    actors: structuredClone(demoActors),
    batches: [
      batch("batch-001", "a0000000-0000-0000-0000-000000000001", "Sabuga ITB Catering", "Paket Nasi Prasmanan Dago", "Makanan siap santap", 35, 8.5, "Coblong, Kota Bandung", "TIER_1_HUMAN_ACTIVE", "food", 1, true, false, null, 180, -6.8863, 107.6080)
    ],
    notifications: [
      { id: "notice-1", title: "Ekosistem Terhubung", body: "SIRKULA-AI terhubung langsung ke basis data PostgreSQL & WebSocket backend.", read: false, createdAt: ago(0.1) }
    ],
    auditLog: []
  };
}

export const FOOD_CATEGORY_OPTIONS = [
  "Santan Basah (Risiko Tinggi)",
  "Basah Non-Santan (Risiko Sedang)",
  "Protein & Karbo Lembap",
  "Gorengan Kering",
  "Roti & Pastry"
];

export const CATEGORY_OPTIONS = [...FOOD_CATEGORY_OPTIONS, "Residu Organik Kompos"];

export const DEMO_PASSWORD = "demo123";
