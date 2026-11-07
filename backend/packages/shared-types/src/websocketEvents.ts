import { ActorRole, BatchState, ClaimStatus, FoodRiskCategory } from './enums.js';

export interface BatchCreatedEventPayload {
  event: 'batch:created';
  batch_id: string;
  batch_summary: string;
  highest_risk_category: FoodRiskCategory;
  total_portions: number;
  total_weight_kg: number;
  current_state: BatchState;
  tier1_expires_at: string;
  tier2_expires_at: string;
  obfuscated_location: {
    latitude: number;
    longitude: number;
  };
  current_ripple_radius_m: number;
  batch?: any;
}

export interface BatchStateTransitionedEventPayload {
  event: 'batch:state_transitioned';
  batch_id: string;
  previous_state: BatchState | null;
  new_state: BatchState;
  reason: string;
  next_expires_at: string | null;
  eligible_role: ActorRole | null;
}

export interface BatchClaimedEventPayload {
  event: 'batch:claimed';
  batch_id: string;
  claim_id: string;
  receiver_id: string;
  claimed_for_tier: string;
  status: ClaimStatus;
  new_state: BatchState;
}

export interface BatchHandoverCompletedEventPayload {
  event: 'batch:handover_completed';
  batch_id: string;
  claim_id: string;
  donor_id: string;
  receiver_id: string;
  waiver_certificate_no: string;
  waiver_signature_hash: string;
  weight_saved_kg: number;
  portions_saved: number;
  co2e_avoided_kg: number;
  methane_ch4_avoided_kg: number;
  estimated_feed_savings_idr: number;
  final_rescued_tier: string;
}

export type SirkulaWebSocketEvent =
  | BatchCreatedEventPayload
  | BatchStateTransitionedEventPayload
  | BatchClaimedEventPayload
  | BatchHandoverCompletedEventPayload;
