import pg from 'pg';

export interface SeedActor {
  id: string;
  name: string;
  role: 'DONOR' | 'TIER_1_HUB' | 'TIER_2_FARMER' | 'TIER_3_COMPOST' | 'ESG_AUDITOR' | 'SIMULATOR_ADMIN';
  phone_whatsapp: string;
  email: string;
  longitude: number;
  latitude: number;
  address_full: string;
  handover_point_notes: string;
  daily_capacity_kg: number;
  priority_score: number;
}

export const SEEDED_ACTORS: SeedActor[] = [
  // 3 DONOR
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Sasana Budaya Ganesha (Sabuga) Convention Hall',
    role: 'DONOR',
    phone_whatsapp: '+6281200000001',
    email: 'catering@sabuga.itb.ac.id',
    longitude: 107.6080,
    latitude: -6.8863,
    address_full: 'Jl. Tamansari No.73, Lb. Siliwangi, Kecamatan Coblong, Kota Bandung',
    handover_point_notes: 'Pintu Bongkar Muat Belakang Gedung Sabuga (Loading Dock Sayap Barat)',
    daily_capacity_kg: 200.0,
    priority_score: 50,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Hotel Savoy Homann Asia Afrika',
    role: 'DONOR',
    phone_whatsapp: '+6281200000002',
    email: 'fnb@savoyhomann.com',
    longitude: 107.6108,
    latitude: -6.9219,
    address_full: 'Jl. Asia Afrika No.112, Cikawao, Kec. Lengkong, Kota Bandung',
    handover_point_notes: 'Loading Dock Dapur Utama Lantai Basement 1',
    daily_capacity_kg: 150.0,
    priority_score: 50,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Warteg Bahari Modern Dago',
    role: 'DONOR',
    phone_whatsapp: '+6281200000003',
    email: 'warteg.dago@gmail.com',
    longitude: 107.6145,
    latitude: -6.8920,
    address_full: 'Jl. Ir. H. Juanda No.142, Lebakgede, Coblong, Kota Bandung',
    handover_point_notes: 'Pintu Dapur Samping Gang Senggol',
    daily_capacity_kg: 50.0,
    priority_score: 50,
  },

  // 4 TIER_1_HUB (Within 800m - 2500m of Sabuga & Dago)
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'DKM Masjid Al-Ukhuwah Balai Kota',
    role: 'TIER_1_HUB',
    phone_whatsapp: '+6281200000011',
    email: 'marbot@alukhuwah-bandung.org',
    longitude: 107.6095,
    latitude: -6.9115,
    address_full: 'Jl. Wastukencana No.27, Babakan Ciamis, Sumur Bandung, Kota Bandung',
    handover_point_notes: 'Posko Relawan DKM Serambi Kanan',
    daily_capacity_kg: 80.0,
    priority_score: 95,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Panti Asuhan Al-Fien Dago',
    role: 'TIER_1_HUB',
    phone_whatsapp: '+6281200000012',
    email: 'pengurus@pantialfien.org',
    longitude: 107.6160,
    latitude: -6.8835,
    address_full: 'Jl. Cisitu Indah VI No.12, Dago, Coblong, Kota Bandung',
    handover_point_notes: 'Dapur Asrama Putra Lantai Dasar',
    daily_capacity_kg: 60.0,
    priority_score: 90,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Dapur Komunitas Warga Tamansari',
    role: 'TIER_1_HUB',
    phone_whatsapp: '+6281200000013',
    email: 'dapur.tamansari@gmail.com',
    longitude: 107.6065,
    latitude: -6.8980,
    address_full: 'Jl. Tamansari Bawah No.45, Tamansari, Bandung Wetan, Kota Bandung',
    handover_point_notes: 'Balai Warga RW 05',
    daily_capacity_kg: 50.0,
    priority_score: 85,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    name: 'Posko Siaga Pangan RT 04 Sukajadi',
    role: 'TIER_1_HUB',
    phone_whatsapp: '+6281200000014',
    email: 'posko.sukajadi@gmail.com',
    longitude: 107.5950,
    latitude: -6.8910,
    address_full: 'Jl. Sukajadi No.88, Pasteur, Sukajadi, Kota Bandung',
    handover_point_notes: 'Pos Ronda Siaga RT 04',
    daily_capacity_kg: 40.0,
    priority_score: 80,
  },

  // 3 TIER_2_FARMER (Maggot BSF, Lele, Unggas - 4 to 8km radius)
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Bio-Larva Maggot BSF Mandiri Cibiru',
    role: 'TIER_2_FARMER',
    phone_whatsapp: '+6281200000021',
    email: 'maggot.cibiru@gmail.com',
    longitude: 107.7120,
    latitude: -6.9320,
    address_full: 'Jl. Cilengkrang 1 No.28, Cisurupan, Cibiru, Kota Bandung',
    handover_point_notes: 'Fasilitas Biokonversi Maggot Kandang A',
    daily_capacity_kg: 500.0,
    priority_score: 50,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Kolam Budidaya Lele Sangkuriang Kopo',
    role: 'TIER_2_FARMER',
    phone_whatsapp: '+6281200000022',
    email: 'lele.kopo@gmail.com',
    longitude: 107.5850,
    latitude: -6.9550,
    address_full: 'Jl. Kopo Cirangrang No.102, Babakan Ciparay, Kota Bandung',
    handover_point_notes: 'Gudang Pengolahan Pakan Fermentasi Kolam 3',
    daily_capacity_kg: 300.0,
    priority_score: 50,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Sentra Peternakan Unggas Rakyat Baleendah',
    role: 'TIER_2_FARMER',
    phone_whatsapp: '+6281200000023',
    email: 'unggas.baleendah@gmail.com',
    longitude: 107.6250,
    latitude: -6.9980,
    address_full: 'Jl. Raya Banjaran No.54, Baleendah, Kab. Bandung',
    handover_point_notes: 'Pintu Masuk Gerbang Timur Peternakan',
    daily_capacity_kg: 400.0,
    priority_score: 50,
  },

  // 1 TIER_3_COMPOST
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    name: 'Bank Sampah Induk Bandung Bersih Babakan Siliwangi',
    role: 'TIER_3_COMPOST',
    phone_whatsapp: '+6281200000031',
    email: 'banksampah.baksil@bandung.go.id',
    longitude: 107.6090,
    latitude: -6.8830,
    address_full: 'Jl. Siliwangi No.7, Lebak Siliwangi, Coblong, Kota Bandung',
    handover_point_notes: 'Hanggar Komposter Organik Skala Kota',
    daily_capacity_kg: 1000.0,
    priority_score: 50,
  },
  // 1 ESG_AUDITOR
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    name: 'Auditor ESG & DLH Kota Bandung',
    role: 'ESG_AUDITOR',
    phone_whatsapp: '+6281200000041',
    email: 'auditor@dlh.bandung.go.id',
    longitude: 107.6186,
    latitude: -6.9039,
    address_full: 'Kantor Dinas Lingkungan Hidup Kota Bandung, Gedung B Lantai 3',
    handover_point_notes: 'Meja Verifikasi Audit Karbon & Metana',
    daily_capacity_kg: 1000.0,
    priority_score: 100,
  },

  // 1 SIMULATOR_ADMIN
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    name: 'Dewan Juri & Simulator Administrator',
    role: 'SIMULATOR_ADMIN',
    phone_whatsapp: '+6281200000051',
    email: 'admin@sirkula.ai',
    longitude: 107.6080,
    latitude: -6.8863,
    address_full: 'Command Center HIMTEC ITB Bandung',
    handover_point_notes: 'Ruang Kontrol Simulasi & Monitoring',
    daily_capacity_kg: 5000.0,
    priority_score: 100,
  },
];

export async function runSeeder() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sirkula_db';
  console.log('[db:seed] Connecting to database...');

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log('[db:seed] Seeding 13 verified actors in Bandung with GEOGRAPHY(Point, 4326)...');

    for (const actor of SEEDED_ACTORS) {
      await client.query(
        `INSERT INTO actors (
          id, name, role, phone_whatsapp, email, location, address_full,
          handover_point_notes, daily_capacity_kg, priority_score, is_verified, is_active
        ) VALUES (
          $1, $2, $3, $4, $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
          $8, $9, $10, $11, TRUE, TRUE
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          location = EXCLUDED.location,
          address_full = EXCLUDED.address_full,
          handover_point_notes = EXCLUDED.handover_point_notes,
          daily_capacity_kg = EXCLUDED.daily_capacity_kg,
          priority_score = EXCLUDED.priority_score,
          is_verified = TRUE,
          is_active = TRUE;`,
        [
          actor.id,
          actor.name,
          actor.role,
          actor.phone_whatsapp,
          actor.email,
          actor.longitude,
          actor.latitude,
          actor.address_full,
          actor.handover_point_notes,
          actor.daily_capacity_kg,
          actor.priority_score,
        ]
      );
    }

    console.log('[db:seed] All 11 actors successfully seeded.');
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeeder().catch((err) => {
    console.error('[db:seed] Seeding failed:', err);
    process.exit(1);
  });
}
