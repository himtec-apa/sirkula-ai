import { z } from 'zod';
import { ActorRole, BatchState, ClaimStatus, FoodRiskCategory, StateTriggerSource } from './enums.js';

export const ActorRoleSchema = z.nativeEnum(ActorRole);
export const FoodRiskCategorySchema = z.nativeEnum(FoodRiskCategory);
export const BatchStateSchema = z.nativeEnum(BatchState);
export const ClaimStatusSchema = z.nativeEnum(ClaimStatus);
export const StateTriggerSourceSchema = z.nativeEnum(StateTriggerSource);

export const DetectedItemSchema = z.object({
  menu_name: z.string().min(1).max(120),
  category: FoodRiskCategorySchema,
  estimated_portions: z.number().int().positive(),
  estimated_weight_kg: z.number().positive(),
  contains_coconut_milk: z.boolean().default(false),
  animal_feed_suitable: z.boolean().default(true),
  ai_confidence_score: z.number().min(0).max(1).default(0.9),
});
export type DetectedItem = z.infer<typeof DetectedItemSchema>;

export const VisionAnalysisResponseSchema = z.object({
  items: z.array(DetectedItemSchema).min(1),
  batch_summary: z.string().min(1).max(255),
  recommended_container: z.string().max(150).optional().default('Box Kontainer Standar'),
  highest_risk_category: FoodRiskCategorySchema,
  total_portions: z.number().int().positive(),
  total_weight_kg: z.number().positive(),
});
export type VisionAnalysisResponse = z.infer<typeof VisionAnalysisResponseSchema>;

export const CreateBatchDtoSchema = z.preprocess((val: any) => {
  if (val && typeof val === 'object') {
    const lat = val.latitude ?? val.donor_location?.latitude ?? val.lat;
    const lng = val.longitude ?? val.donor_location?.longitude ?? val.lng ?? val.lon;
    const exposed = val.exposed_minutes ?? val.exposed_minutes_prior ?? 0;
    const ac = val.is_ac_room ?? val.ac_room ?? false;
    return {
      ...val,
      latitude: lat,
      longitude: lng,
      exposed_minutes: exposed,
      is_ac_room: ac,
    };
  }
  return val;
}, z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  exposed_minutes: z.coerce.number().int().min(0).default(0),
  is_ac_room: z.coerce.boolean().default(false),
  image_url: z.string().optional(),
  image_base64: z.string().optional(),
}));
export type CreateBatchDto = z.infer<typeof CreateBatchDtoSchema>;

export const NearbyBatchesQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().int().min(100).max(50000).optional().default(1500),
});
export type NearbyBatchesQuery = z.infer<typeof NearbyBatchesQuerySchema>;

export const ClaimBatchDtoSchema = z.object({
  claimed_for_tier: z.enum(['TIER_1_HUMAN', 'TIER_2_ANIMAL', 'TIER_3_COMPOST']).optional(),
});
export type ClaimBatchDto = z.infer<typeof ClaimBatchDtoSchema>;

export const VerifyHandoverDtoSchema = z.object({
  qr_token: z.string().min(1),
  handover_ambient_temp_c: z.coerce.number().optional(),
  handover_latitude: z.coerce.number().min(-90).max(90).optional(),
  handover_longitude: z.coerce.number().min(-180).max(180).optional(),
  liability_waiver_accepted: z.coerce.boolean().default(true),
});
export type VerifyHandoverDto = z.infer<typeof VerifyHandoverDtoSchema>;

export const TimeWarpSimulationDtoSchema = z.object({
  batch_id: z.string().uuid(),
  override_temp_c: z.coerce.number().min(-10).max(60).optional(),
  force_expire_tier1: z.coerce.boolean().optional().default(false),
  force_expire_tier2: z.coerce.boolean().optional().default(false),
  notes: z.string().optional().default('God-Mode Time-Warp Simulation Triggered'),
});
export type TimeWarpSimulationDto = z.infer<typeof TimeWarpSimulationDtoSchema>;
