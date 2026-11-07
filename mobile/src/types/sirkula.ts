export enum ActorRole {
  DONOR = "DONOR",
  TIER_1_HUB = "TIER_1_HUB",
  TIER_2_FARMER = "TIER_2_FARMER",
  TIER_3_COMPOST = "TIER_3_COMPOST",
  ESG_AUDITOR = "ESG_AUDITOR",
  SIMULATOR_ADMIN = "SIMULATOR_ADMIN",
}

export type FieldRole =
  | ActorRole.DONOR
  | ActorRole.TIER_1_HUB
  | ActorRole.TIER_2_FARMER
  | ActorRole.TIER_3_COMPOST
  | ActorRole.ESG_AUDITOR
  | ActorRole.SIMULATOR_ADMIN;

export const FIELD_ROLES: readonly FieldRole[] = [
  ActorRole.DONOR,
  ActorRole.TIER_1_HUB,
  ActorRole.TIER_2_FARMER,
  ActorRole.TIER_3_COMPOST,
  ActorRole.ESG_AUDITOR,
  ActorRole.SIMULATOR_ADMIN,
];

export enum FoodRiskCategory {
  WET_COCONUT_MILK = "WET_COCONUT_MILK",
  WET_NON_COCONUT = "WET_NON_COCONUT",
  MOIST_PROTEIN_CARB = "MOIST_PROTEIN_CARB",
  DRY_FRIED = "DRY_FRIED",
  BAKERY_PASTRY = "BAKERY_PASTRY",
}

export enum BatchState {
  TIER_1_HUMAN_ACTIVE = "TIER_1_HUMAN_ACTIVE",
  TIER_1_CLAIMED = "TIER_1_CLAIMED",
  TIER_2_ANIMAL_ACTIVE = "TIER_2_ANIMAL_ACTIVE",
  TIER_2_CLAIMED = "TIER_2_CLAIMED",
  TIER_3_COMPOST_ACTIVE = "TIER_3_COMPOST_ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED_BY_DONOR = "CANCELLED_BY_DONOR",
}

export enum ClaimStatus {
  ACTIVE_EN_ROUTE = "ACTIVE_EN_ROUTE",
  HANDOVER_COMPLETED = "HANDOVER_COMPLETED",
  EXPIRED_AUTO_REVOKED = "EXPIRED_AUTO_REVOKED",
  CANCELLED_BY_RECEIVER = "CANCELLED_BY_RECEIVER",
}

export enum StateTriggerSource {
  INITIAL_INGESTION = "INITIAL_INGESTION",
  BULLMQ_BIO_TIMER = "BULLMQ_BIO_TIMER",
  USER_CLAIM_ACTION = "USER_CLAIM_ACTION",
  QR_HANDSHAKE_SCAN = "QR_HANDSHAKE_SCAN",
  GOD_MODE_SIMULATOR = "GOD_MODE_SIMULATOR",
}

export type RescueTier =
  | "TIER_1_HUMAN"
  | "TIER_2_ANIMAL"
  | "TIER_3_COMPOST";

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface Actor {
  id: string;
  name: string;
  role: ActorRole;
  phone_whatsapp: string;
  email: string | null;
  location: GeoJsonPoint;
  address_full: string;
  handover_point_notes: string | null;
  daily_capacity_kg: number | null;
  priority_score: number;
  expo_push_token: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchItem {
  id: string;
  batch_id: string;
  menu_name: string;
  category: FoodRiskCategory;
  estimated_portions: number;
  estimated_weight_kg: number;
  contains_coconut_milk: boolean;
  animal_feed_suitable: boolean;
  ai_confidence_score: number;
  created_at: string;
}

export interface FoodBatch {
  id: string;
  donor_id: string;
  image_url: string;
  batch_summary: string;
  vision_raw_json: Record<string, unknown>;
  highest_risk_category: FoodRiskCategory;
  total_portions: number;
  total_weight_kg: number;
  recommended_container: string | null;
  ambient_temp_c: number;
  humidity_pct: number;
  is_ac_room: boolean;
  exposed_minutes_prior: number;
  base_shelf_life_min: number;
  q10_decay_multiplier: number;
  safe_window_human_min: number;
  exact_pickup_location: GeoJsonPoint;
  obfuscated_location: GeoJsonPoint;
  current_ripple_radius_m: number;
  current_state: BatchState;
  tier1_expires_at: string;
  tier2_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface RescueClaim {
  id: string;
  batch_id: string;
  receiver_id: string;
  claimed_for_tier: RescueTier;
  status: ClaimStatus;
  qr_token?: string;
  qr_token_hash: string;
  qr_expires_at: string;
  claimed_at: string;
  handover_scanned_at: string | null;
  handover_ambient_temp_c: number | null;
  handover_scan_location: GeoJsonPoint | null;
  liability_waiver_accepted: boolean;
  waiver_signature_hash: string | null;
  revocation_reason: string | null;
  updated_at: string;
}

export interface BatchWithItems extends FoodBatch {
  items: BatchItem[];
  donor?: Actor;
  active_claim?: RescueClaim | null;
  handover_point_notes?: string | null;
}

export interface EsgTelemetryLog {
  id: string;
  batch_id: string;
  claim_id: string;
  donor_id: string;
  receiver_id: string;
  final_rescued_tier: RescueTier;
  weight_saved_kg: number;
  portions_saved: number;
  co2e_avoided_kg: number;
  methane_ch4_avoided_kg: number;
  estimated_feed_savings_idr: number;
  waiver_certificate_no: string;
  waiver_pdf_url: string | null;
  recorded_at: string;
}

export interface BatchStateAuditLog {
  id: string;
  batch_id: string;
  previous_state: BatchState | null;
  new_state: BatchState;
  trigger_source: StateTriggerSource;
  simulated_temp_override_c: number | null;
  notes: string | null;
  transitioned_at: string;
}

export interface WaiverCertificate {
  waiver_certificate_no: string;
  donor_name: string;
  receiver_name: string;
  weight_saved_kg: number;
  co2e_avoided_kg: number;
  recorded_at: string;
  waiver_signature_hash: string;
}

export interface EsgSummary {
  summary_period: string;
  total_batches_rescued: number;
  total_portions_saved: number;
  total_weight_saved_kg: number;
  co2e_avoided_kg: number;
  methane_ch4_avoided_kg: number;
  estimated_feed_savings_idr: number;
  recent_waiver_certificates: WaiverCertificate[];
}

export interface BatchCreatedPayload {
  batch?: BatchWithItems;
  batch_id?: string;
  [key: string]: unknown;
}

export interface BatchStateTransitionedPayload {
  batch_id: string;
  previous_state?: BatchState;
  new_state: BatchState;
  trigger_source?: StateTriggerSource;
  transitioned_at?: string;
  batch?: BatchWithItems;
  [key: string]: unknown;
}

export interface BatchClaimedPayload {
  claim?: RescueClaim;
  batch_id?: string;
  claim_id?: string;
  receiver_id?: string;
  new_state?: BatchState;
  batch?: BatchWithItems;
  [key: string]: unknown;
}

export interface BatchHandoverCompletedPayload {
  batch_id: string;
  claim?: RescueClaim;
  batch?: BatchWithItems;
  [key: string]: unknown;
}

export interface ServerToClientEvents {
  "batch:created": (payload: BatchCreatedPayload) => void;
  "batch:state_transitioned": (payload: BatchStateTransitionedPayload) => void;
  "batch:claimed": (payload: BatchClaimedPayload) => void;
  "batch:handover_completed": (payload: BatchHandoverCompletedPayload) => void;
}

export interface ClientToServerEvents {
  "actor:subscribe": (payload: { actor_id: string; role: ActorRole }) => void;
}

export const FOOD_RISK_LABELS: Record<FoodRiskCategory, string> = {
  [FoodRiskCategory.WET_COCONUT_MILK]: "Bersantan dan berkuah",
  [FoodRiskCategory.WET_NON_COCONUT]: "Berkuah tanpa santan",
  [FoodRiskCategory.MOIST_PROTEIN_CARB]: "Karbohidrat dan protein lembap",
  [FoodRiskCategory.DRY_FRIED]: "Gorengan atau lauk kering",
  [FoodRiskCategory.BAKERY_PASTRY]: "Roti, kue, atau buah",
};
