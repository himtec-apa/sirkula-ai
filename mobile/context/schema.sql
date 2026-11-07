-- ============================================================================
-- SIRKULA-AI DATABASE SCHEMA (PostgreSQL 16 + PostGIS)
-- Platform Penyelamatan Pangan Berbasis Vision AI & 3-Tier Bio-Thermal Triage
-- ============================================================================

-- 1. AKTIVASI EKSTENSI
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. DEFINISI TIPE ENUMERASI (CUSTOM TYPES)
CREATE TYPE actor_role_enum AS ENUM (
    'DONOR',            -- Katering, Restoran, Hotel, Warteg, Panitia Acara
    'TIER_1_HUB',       -- Simpul Warga: Marbot Masjid, RT/RW, Panti Asuhan
    'TIER_2_FARMER',    -- Peternak Maggot BSF, Lele, Unggas
    'TIER_3_COMPOST',   -- Bank Sampah Organik, Komunitas Kompos
    'ESG_AUDITOR',      -- Manajer CSR, Dinas Lingkungan Hidup (DLH)
    'SIMULATOR_ADMIN'   -- Dewan Juri Hackathon / Admin Sistem
);

CREATE TYPE food_risk_category_enum AS ENUM (
    'WET_COCONUT_MILK',   -- Santan/Gulai/Opor (t_base: 120 menit)
    'WET_NON_COCONUT',    -- Kuah non-santan/Sop/Capcay (t_base: 180 menit)
    'MOIST_PROTEIN_CARB', -- Nasi putih, Mie, Ayam bumbu basah (t_base: 240 menit)
    'DRY_FRIED',          -- Gorengan kering, Rendang kering, Tempe orek (t_base: 360 menit)
    'BAKERY_PASTRY'       -- Roti, Kue kotak, Buah utuh/potong (t_base: 300 menit)
);

CREATE TYPE batch_state_enum AS ENUM (
    'TIER_1_HUMAN_ACTIVE',   -- Terbuka untuk klaim Simpul Komunitas Manusia
    'TIER_1_CLAIMED',        -- Diklaim Simpul Manusia, menunggu kurir tiba & scan QR
    'TIER_2_ANIMAL_ACTIVE',  -- Terkunci bagi manusia; terbuka untuk Peternak Maggot/Lele
    'TIER_2_CLAIMED',        -- Diklaim Peternak, menunggu penjemputan pakan
    'TIER_3_COMPOST_ACTIVE', -- Terdegradasi lanjut; dialihkan ke Bank Sampah/Kompos
    'COMPLETED',             -- Serah terima selesai (QR terverifikasi & Waiver terbit)
    'CANCELLED_BY_DONOR'     -- Dibatalkan secara manual oleh donatur sebelum diambil
);

CREATE TYPE claim_status_enum AS ENUM (
    'ACTIVE_EN_ROUTE',       -- Kurir sedang dalam perjalanan menuju lokasi donatur
    'HANDOVER_COMPLETED',    -- QR berhasil dipindai tepat waktu, serah terima sah
    'EXPIRED_AUTO_REVOKED',  -- Dibatalkan paksa oleh sistem karena melewati batas aman biologis
    'CANCELLED_BY_RECEIVER'  -- Kurir membatalkan klaim secara manual
);

CREATE TYPE state_trigger_source_enum AS ENUM (
    'INITIAL_INGESTION',     -- Pembuatan awal saat foto diunggah
    'BULLMQ_BIO_TIMER',      -- Mutasi otomatis karena waktu aman (TTL) habis
    'USER_CLAIM_ACTION',     -- Perubahan status karena diklaim kurir
    'QR_HANDSHAKE_SCAN',     -- Penyelesaian transaksi via scan QR
    'GOD_MODE_SIMULATOR'     -- Intervensi paksa dari panel simulator juri di Web
);

-- ============================================================================
-- 3. TABEL MASTER AKTOR & SIMPUL (actors)
-- Menyimpan profil pengguna beserta titik koordinat spasialnya.
-- ============================================================================
CREATE TABLE actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    role actor_role_enum NOT NULL,
    phone_whatsapp VARCHAR(25) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    
    -- Koordinat presisi (WGS 84) untuk kalkulasi rute dan jarak PostGIS
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address_full TEXT NOT NULL,
    
    -- Instruksi pintu belakang / loading dock (hanya dibuka setelah status CLAIMED)
    handover_point_notes TEXT,
    
    -- Kapasitas tampung maksimal per hari (dalam kg) untuk Simpul/Peternak
    daily_capacity_kg NUMERIC(6, 2) DEFAULT 25.00 CHECK (daily_capacity_kg > 0),
    
    -- Skor prioritas kerentanan wilayah (1-100) untuk pengurutan distribusi Tier 1
    priority_score INT DEFAULT 50 CHECK (priority_score BETWEEN 1 AND 100),
    
    expo_push_token VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN actors.location IS 'Titik koordinat geografis asli aktor (SRID 4326) untuk query ST_DWithin.';
COMMENT ON COLUMN actors.handover_point_notes IS 'Detail lokasi serah terima tertutup (misal: Pintu Loading Dock B2) demi menjaga privasi & mencegah kerumunan.';

-- ============================================================================
-- 4. TABEL INTI BATCH MAKANAN (food_batches)
-- Entitas utama yang dikendalikan oleh State Machine Bio-Thermal.
-- ============================================================================
CREATE TABLE food_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Data Visual & Ringkasan AI
    image_url TEXT NOT NULL,
    batch_summary VARCHAR(255) NOT NULL,
    vision_raw_json JSONB NOT NULL, -- Menyimpan payload utuh dari Gemini 2.5 Flash
    highest_risk_category food_risk_category_enum NOT NULL,
    
    -- Kuantitas Agregat
    total_portions INT NOT NULL CHECK (total_portions > 0),
    total_weight_kg NUMERIC(6, 2) NOT NULL CHECK (total_weight_kg > 0),
    recommended_container VARCHAR(150),
    
    -- Parameter Lingkungan & Bio-Thermal saat Ingesti
    ambient_temp_c NUMERIC(4, 1) NOT NULL CHECK (ambient_temp_c BETWEEN -10.0 AND 60.0),
    humidity_pct INT NOT NULL CHECK (humidity_pct BETWEEN 0 AND 100),
    is_ac_room BOOLEAN NOT NULL DEFAULT FALSE,
    exposed_minutes_prior INT NOT NULL DEFAULT 0 CHECK (exposed_minutes_prior >= 0),
    
    -- Hasil Perhitungan Model Mikrobiologi Q10
    base_shelf_life_min INT NOT NULL CHECK (base_shelf_life_min > 0),
    q10_decay_multiplier NUMERIC(5, 3) NOT NULL DEFAULT 1.000,
    safe_window_human_min INT NOT NULL CHECK (safe_window_human_min >= 0),
    
    -- Lokasi Spasial (Asli vs Disamarkan untuk Peta Publik/Radar Awal)
    exact_pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
    obfuscated_location GEOGRAPHY(Point, 4326) NOT NULL,
    current_ripple_radius_m INT NOT NULL DEFAULT 1500 CHECK (current_ripple_radius_m >= 500),
    
    -- State Machine & Batas Waktu Mutlak (Cut-off Timestamps)
    current_state batch_state_enum NOT NULL DEFAULT 'TIER_1_HUMAN_ACTIVE',
    tier1_expires_at TIMESTAMPTZ NOT NULL, -- Waktu mutasi ke Tier 2 (Pakan Ternak)
    tier2_expires_at TIMESTAMPTZ NOT NULL, -- Waktu mutasi ke Tier 3 (Kompos)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_expiry_chronology CHECK (tier2_expires_at > tier1_expires_at)
);

COMMENT ON COLUMN food_batches.obfuscated_location IS 'Koordinat yang digeser acak 200-300m untuk ditampilkan di radar sebelum klaim dikunci.';
COMMENT ON COLUMN food_batches.tier1_expires_at IS 'Batas waktu aman konsumsi manusia. Jika terlewati, sistem wajib mengunci akses Tier 1.';

-- ============================================================================
-- 5. TABEL RINCIAN ITEM MENU (batch_items)
-- Rincian setiap jenis lauk/makanan yang terdeteksi dalam 1 foto prasmanan.
-- ============================================================================
CREATE TABLE batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES food_batches(id) ON DELETE CASCADE ON UPDATE CASCADE,
    menu_name VARCHAR(120) NOT NULL,
    category food_risk_category_enum NOT NULL,
    estimated_portions INT NOT NULL CHECK (estimated_portions > 0),
    estimated_weight_kg NUMERIC(5, 2) NOT NULL CHECK (estimated_weight_kg > 0),
    contains_coconut_milk BOOLEAN NOT NULL DEFAULT FALSE,
    animal_feed_suitable BOOLEAN NOT NULL DEFAULT TRUE,
    ai_confidence_score NUMERIC(4, 3) DEFAULT 0.900 CHECK (ai_confidence_score BETWEEN 0.000 AND 1.000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN batch_items.animal_feed_suitable IS 'Penanda apakah item aman untuk pakan maggot/lele (false jika terlalu banyak tulang keras/cabai ekstrem).';

-- ============================================================================
-- 6. TABEL TRANSAKSI KLAIM & DIGITAL LIABILITY WAIVER (rescue_claims)
-- Mengelola kunci klaim kurir, token QR HMAC, dan bukti serah terima hukum.
-- ============================================================================
CREATE TABLE rescue_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES food_batches(id) ON DELETE CASCADE ON UPDATE CASCADE,
    receiver_id UUID NOT NULL REFERENCES actors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    claimed_for_tier VARCHAR(15) NOT NULL CHECK (claimed_for_tier IN ('TIER_1_HUMAN', 'TIER_2_ANIMAL', 'TIER_3_COMPOST')),
    status claim_status_enum NOT NULL DEFAULT 'ACTIVE_EN_ROUTE',
    
    -- Keamanan Blind-Match Handshake
    qr_token_hash VARCHAR(256) NOT NULL UNIQUE,
    qr_expires_at TIMESTAMPTZ NOT NULL,
    
    -- Telemetri Saat Serah Terima (Scan QR di Lokasi)
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handover_scanned_at TIMESTAMPTZ,
    handover_ambient_temp_c NUMERIC(4, 1),
    handover_scan_location GEOGRAPHY(Point, 4326),
    
    -- Digital Liability Shield (Perlindungan Hukum Donatur)
    liability_waiver_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    waiver_signature_hash VARCHAR(256) UNIQUE, -- SHA-256(batch_id + receiver_id + handover_scanned_at + temp)
    revocation_reason TEXT,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN rescue_claims.waiver_signature_hash IS 'Bukti kriptografi pelepasan tuntutan hukum bahwa makanan diserahkan sebelum batas tier1_expires_at.';

-- Partial Unique Index: Memastikan hanya boleh ada 1 klaim berstatus ACTIVE_EN_ROUTE per batch pada satu waktu
CREATE UNIQUE INDEX idx_unique_active_claim_per_batch 
ON rescue_claims (batch_id) 
WHERE status = 'ACTIVE_EN_ROUTE';

-- ============================================================================
-- 7. TABEL TELEMETRI ESG & DAMPAK LINGKUNGAN (esg_telemetry_logs)
-- Mencatat metrik karbon, gas metana, dan nilai ekonomi pakan secara otomatis.
-- ============================================================================
CREATE TABLE esg_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL UNIQUE REFERENCES food_batches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    claim_id UUID NOT NULL UNIQUE REFERENCES rescue_claims(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    donor_id UUID NOT NULL REFERENCES actors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    receiver_id UUID NOT NULL REFERENCES actors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    final_rescued_tier VARCHAR(15) NOT NULL CHECK (final_rescued_tier IN ('TIER_1_HUMAN', 'TIER_2_ANIMAL', 'TIER_3_COMPOST')),
    weight_saved_kg NUMERIC(6, 2) NOT NULL CHECK (weight_saved_kg > 0),
    portions_saved INT NOT NULL DEFAULT 0,
    
    -- Kalkulasi Otomatis (Generated Columns) sesuai Formula PRD
    co2e_avoided_kg NUMERIC(8, 2) GENERATED ALWAYS AS (ROUND(weight_saved_kg * 2.50, 2)) STORED,
    methane_ch4_avoided_kg NUMERIC(8, 3) GENERATED ALWAYS AS (ROUND(weight_saved_kg * 0.150, 3)) STORED,
    estimated_feed_savings_idr NUMERIC(12, 2) GENERATED ALWAYS AS (ROUND(weight_saved_kg * 3800.00, 2)) STORED,
    
    waiver_certificate_no VARCHAR(60) NOT NULL UNIQUE, -- Format: SRK-ESG-202611-XXXX
    waiver_pdf_url TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN esg_telemetry_logs.co2e_avoided_kg IS '1 kg penyelamatan limbah pangan mencegah ~2.5 kg emisi setara CO2.';

-- ============================================================================
-- 8. TABEL AUDIT MUTASI STATE & SIMULATOR (batch_state_audit_logs)
-- Mencatat jejak perpindahan Tier (termasuk intervensi God-Mode saat demo).
-- ============================================================================
CREATE TABLE batch_state_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES food_batches(id) ON DELETE CASCADE ON UPDATE CASCADE,
    previous_state batch_state_enum,
    new_state batch_state_enum NOT NULL,
    trigger_source state_trigger_source_enum NOT NULL,
    simulated_temp_override_c NUMERIC(4, 1),
    notes TEXT,
    transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. INDEKS PERFORMA & GEOSPASIAL (INDEXING STRATEGY)
-- ============================================================================

-- Indeks Spasial GIST untuk pencarian radius cepat (ST_DWithin)
CREATE INDEX idx_actors_location_gist ON actors USING GIST (location);
CREATE INDEX idx_actors_role_active ON actors (role, is_active) WHERE is_active = TRUE;

CREATE INDEX idx_batches_exact_loc_gist ON food_batches USING GIST (exact_pickup_location);
CREATE INDEX idx_batches_obfuscated_loc_gist ON food_batches USING GIST (obfuscated_location);

-- Indeks Komposit untuk Radar Mobile & BullMQ Triage Sweeper
CREATE INDEX idx_batches_state_tier1_exp ON food_batches (current_state, tier1_expires_at);
CREATE INDEX idx_batches_state_tier2_exp ON food_batches (current_state, tier2_expires_at);
CREATE INDEX idx_batches_donor_created ON food_batches (donor_id, created_at DESC);

-- Indeks Pencarian Cepat Item, Klaim & Agregasi ESG
CREATE INDEX idx_batch_items_batch_id ON batch_items (batch_id);
CREATE INDEX idx_claims_batch_status ON rescue_claims (batch_id, status);
CREATE INDEX idx_claims_receiver_status ON rescue_claims (receiver_id, status);
CREATE INDEX idx_esg_donor_recorded ON esg_telemetry_logs (donor_id, recorded_at DESC);
CREATE INDEX idx_audit_batch_time ON batch_state_audit_logs (batch_id, transitioned_at DESC);

-- ============================================================================
-- 10. TRIGGER OTOMATISASI KOLOM updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_actors_updated_at
BEFORE UPDATE ON actors
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_food_batches_updated_at
BEFORE UPDATE ON food_batches
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_rescue_claims_updated_at
BEFORE UPDATE ON rescue_claims
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();