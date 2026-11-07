import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { env } from "@/config/env";
import { useActorStore, type ActorHeaders } from "@/store/useActorStore";
import {
  ActorRole,
  ClaimStatus,
  type Actor,
  type BatchWithItems,
  type EsgSummary,
  type FieldRole,
  type RescueClaim,
  type RescueTier,
} from "@/types/sirkula";
import type { CapturedImage } from "@/lib/image";

const ANALYZE_TIMEOUT_MS = 20_000;

export class AnalyzeBatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeBatchError";
  }
}

export class ClaimConflictError extends Error {
  constructor(message = "Misi ini baru saja diklaim oleh simpul lain.") {
    super(message);
    this.name = "ClaimConflictError";
  }
}

export class HandoverVerificationError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "HandoverVerificationError";
    this.statusCode = statusCode;
  }
}

export class SafetyInvariantError extends HandoverVerificationError {
  constructor(
    message = "Batas aman konsumsi manusia terlampaui. Klaim manusia dibatalkan dan dialihkan ke pakan ternak (422 Unprocessable Entity).",
  ) {
    super(message, 422);
    this.name = "SafetyInvariantError";
  }
}

export interface AnalyzeBatchInput {
  image: CapturedImage;
  exposedMinutes: number;
  isAcRoom: boolean;
  latitude: number;
  longitude: number;
  actorHeaders: ActorHeaders;
}

export interface VerifyHandoverInput {
  batchId: string;
  claimId: string;
  qrToken: string;
  scannedAt: string;
  waiverSignatureHash: string;
  actorHeaders: ActorHeaders;
  handoverAmbientTempC?: number | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
  offlineVerified?: boolean;
}

export interface VerifyHandoverResult {
  success: boolean;
  batch_id: string;
  claim: RescueClaim;
  waiver_certificate_no?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRawBatch(raw: Record<string, unknown>): BatchWithItems {
  const obfuscatedLat = Number(raw.obfuscated_lat ?? (raw.obfuscated_location as any)?.latitude ?? -6.8863);
  const obfuscatedLng = Number(raw.obfuscated_lng ?? (raw.obfuscated_location as any)?.longitude ?? 107.6080);
  const exactLat = Number(raw.exact_lat ?? (raw.exact_pickup_location as any)?.latitude ?? obfuscatedLat);
  const exactLng = Number(raw.exact_lng ?? (raw.exact_pickup_location as any)?.longitude ?? obfuscatedLng);

  return {
    id: String(raw.id ?? raw.batch_id ?? ""),
    donor_id: String(raw.donor_id ?? ""),
    image_url: String(raw.image_url ?? ""),
    batch_summary: String(raw.batch_summary ?? "Batch Pangan"),
    vision_raw_json: (raw.vision_raw_json as Record<string, unknown>) ?? {},
    highest_risk_category: raw.highest_risk_category as any,
    total_portions: Number(raw.total_portions ?? 0),
    total_weight_kg: Number(raw.total_weight_kg ?? 0),
    recommended_container: (raw.recommended_container as string | null) ?? null,
    ambient_temp_c: Number(raw.ambient_temp_c ?? 29.5),
    humidity_pct: Number(raw.humidity_pct ?? 75),
    is_ac_room: Boolean(raw.is_ac_room),
    exposed_minutes_prior: Number(raw.exposed_minutes_prior ?? 0),
    base_shelf_life_min: Number(raw.base_shelf_life_min ?? 120),
    q10_decay_multiplier: Number(raw.q10_decay_multiplier ?? 1.8),
    safe_window_human_min: Number(raw.safe_window_human_min ?? 60),
    exact_pickup_location: {
      type: "Point",
      coordinates: [exactLng, exactLat],
    },
    obfuscated_location: {
      type: "Point",
      coordinates: [obfuscatedLng, obfuscatedLat],
    },
    current_ripple_radius_m: Number(raw.current_ripple_radius_m ?? 1500),
    current_state: raw.current_state as any,
    tier1_expires_at: String(raw.tier1_expires_at ?? new Date().toISOString()),
    tier2_expires_at: String(raw.tier2_expires_at ?? new Date().toISOString()),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
    items: Array.isArray(raw.items) ? (raw.items as any) : [],
    donor: raw.donor as any,
    active_claim: (raw.active_claim as any) ?? null,
    handover_point_notes: (raw.handover_point_notes as string | null) ?? null,
  };
}

export interface RegisterActorInput {
  name: string;
  role: FieldRole;
  email: string;
  phone_whatsapp: string;
  password?: string;
  address_full?: string;
  handover_point_notes?: string;
  latitude?: number;
  longitude?: number;
  daily_capacity_kg?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
  actor: Actor;
}

export function normalizeRawActor(raw: Record<string, unknown>): Actor {
  const lat = Number(
    raw.latitude ?? (raw.location as any)?.coordinates?.[1] ?? -6.8863
  );
  const lng = Number(
    raw.longitude ?? (raw.location as any)?.coordinates?.[0] ?? 107.6080
  );

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Mitra Lapangan"),
    role: (raw.role as ActorRole) ?? ActorRole.DONOR,
    phone_whatsapp: String(raw.phone_whatsapp ?? ""),
    email: raw.email ? String(raw.email) : null,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
    address_full: String(raw.address_full ?? "Kota Bandung"),
    handover_point_notes: raw.handover_point_notes ? String(raw.handover_point_notes) : null,
    daily_capacity_kg: raw.daily_capacity_kg != null ? Number(raw.daily_capacity_kg) : null,
    priority_score: Number(raw.priority_score ?? 50),
    expo_push_token: raw.expo_push_token ? String(raw.expo_push_token) : null,
    is_verified: Boolean(raw.is_verified ?? true),
    is_active: Boolean(raw.is_active ?? true),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export async function registerActorApi(input: RegisterActorInput): Promise<AuthResponse> {
  const res = await fetch(`${env.apiUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      role: input.role,
      email: input.email.trim().toLowerCase(),
      phone_whatsapp: input.phone_whatsapp.trim(),
      address_full: input.address_full || "Kota Bandung",
      handover_point_notes: input.handover_point_notes || "Loading Dock Utama",
      latitude: input.latitude ?? -6.8863,
      longitude: input.longitude ?? 107.6080,
      daily_capacity_kg: input.daily_capacity_kg ?? 50.0,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.message ?? `Pendaftaran gagal (${res.status}).`);
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type ?? "Bearer",
    expires_in_seconds: data.expires_in_seconds ?? 604800,
    actor: normalizeRawActor(data.actor ?? {}),
  };
}

export async function loginActorApi(
  identifier: string,
  password?: string
): Promise<AuthResponse> {
  const trimmed = identifier.trim().toLowerCase();

  // 1. Try POST /api/v1/auth/login directly
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: trimmed, password }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        access_token: data.access_token,
        token_type: data.token_type ?? "Bearer",
        expires_in_seconds: data.expires_in_seconds ?? 604800,
        actor: normalizeRawActor(data.actor ?? {}),
      };
    }
  } catch {
    // Fallback to query actors list
  }

  // 2. Query actors list
  const actorsRes = await fetch(`${env.apiUrl}/api/v1/auth/actors`);
  if (!actorsRes.ok) {
    throw new Error("Gagal menghubungkan ke server autentikasi.");
  }
  const actorsData = (await actorsRes.json()) as any;
  const actorsList = Array.isArray(actorsData.actors) ? actorsData.actors : [];

  const matched = actorsList.find((a: any) => {
    const emailMatch = a.email && String(a.email).toLowerCase() === trimmed;
    const phoneMatch =
      a.phone_whatsapp &&
      String(a.phone_whatsapp).replace(/\D/g, "") === trimmed.replace(/\D/g, "");
    const idMatch = a.id === trimmed;
    return emailMatch || phoneMatch || idMatch;
  });

  if (!matched) {
    throw new Error("Akun belum terdaftar di sistem. Silakan mendaftar terlebih dahulu.");
  }

  // Generate token via POST /api/v1/auth/token
  const tokenRes = await fetch(`${env.apiUrl}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor_id: matched.id }),
  });

  if (!tokenRes.ok) {
    throw new Error("Gagal menerbitkan token autentikasi.");
  }

  const tokenData = (await tokenRes.json()) as any;
  return {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type ?? "Bearer",
    expires_in_seconds: tokenData.expires_in_seconds ?? 604800,
    actor: normalizeRawActor({ ...matched, ...tokenData.actor }),
  };
}

export async function fetchAllActors(): Promise<Actor[]> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/actors`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const list = Array.isArray(data.actors) ? data.actors : [];
    return list.map((item: any) => normalizeRawActor(item));
  } catch {
    return [];
  }
}

export async function fetchActorById(actorId: string): Promise<Actor | null> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/actors/${encodeURIComponent(actorId)}`);
    if (!res.ok) return null;
    const raw = (await res.json()) as any;
    return normalizeRawActor(raw);
  } catch {
    return null;
  }
}

export async function fetchAuthToken(actorId: string): Promise<string | null> {
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchEsgSummary(): Promise<EsgSummary> {
  const res = await fetch(`${env.apiUrl}/api/v1/analytics/esg-summary`);
  if (!res.ok) {
    throw new Error(`Gagal mengambil telemetri ESG (${res.status}).`);
  }
  const data = (await res.json()) as any;
  return {
    summary_period: data.summary_period ?? "All-Time Real-Time Telemetry",
    total_batches_rescued: Number(data.total_batches_rescued ?? 0),
    total_portions_saved: Number(data.total_portions_saved ?? 0),
    total_weight_saved_kg: Number(data.total_weight_saved_kg ?? 0),
    co2e_avoided_kg: Number(data.co2e_avoided_kg ?? 0),
    methane_ch4_avoided_kg: Number(data.methane_ch4_avoided_kg ?? 0),
    estimated_feed_savings_idr: Number(data.estimated_feed_savings_idr ?? 0),
    recent_waiver_certificates: Array.isArray(data.recent_waiver_certificates)
      ? data.recent_waiver_certificates
      : [],
  };
}

export async function analyzeAndCreate(
  input: AnalyzeBatchInput,
): Promise<BatchWithItems> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  try {
    const formData = new FormData();
    if (Platform.OS === "web") {
      try {
        const res = await fetch(input.image.uri);
        const blob = await res.blob();
        formData.append("image", blob, input.image.name);
      } catch {
        formData.append("image_url", input.image.uri);
      }
    } else {
      formData.append(
        "image",
        {
          uri: input.image.uri,
          name: input.image.name,
          type: input.image.type || "image/jpeg",
        } as unknown as Blob,
      );
    }
    formData.append("exposed_minutes", String(input.exposedMinutes));
    formData.append("is_ac_room", String(input.isAcRoom));
    formData.append("latitude", input.latitude.toFixed(6));
    formData.append("longitude", input.longitude.toFixed(6));
    if (input.image.uri && input.image.uri.startsWith("http")) {
      formData.append("image_url", input.image.uri);
    }

    const response = await fetch(
      `${env.apiUrl}/api/v1/batches/analyze-and-create`,
      {
        method: "POST",
        headers: {
          ...input.actorHeaders,
          Accept: "application/json",
        },
        body: formData,
        signal: controller.signal,
      },
    );

    const payload = (await response.json()) as any;

    if (!response.ok) {
      throw new AnalyzeBatchError(
        payload.message ?? payload.error ?? `Backend menolak permintaan analisis (${response.status}).`,
      );
    }

    const batchId = payload.batch_id ?? payload.id;
    if (batchId) {
      return await fetchBatchDetail(batchId, input.actorHeaders);
    }

    throw new AnalyzeBatchError("Respons backend tidak sesuai kontrak batch SIRKULA-AI.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function claimBatch(input: {
  batchId: string;
  actorHeaders: ActorHeaders;
}): Promise<{ claim: RescueClaim; batch: BatchWithItems }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const isFarmer = input.actorHeaders["x-actor-role"] === "TIER_2_FARMER";
    const isCompost = input.actorHeaders["x-actor-role"] === "TIER_3_COMPOST";
    const preferredTier: RescueTier = isFarmer
      ? "TIER_2_ANIMAL"
      : isCompost
        ? "TIER_3_COMPOST"
        : "TIER_1_HUMAN";

    const response = await fetch(
      `${env.apiUrl}/api/v1/batches/${input.batchId}/claim`,
      {
        method: "POST",
        headers: {
          ...input.actorHeaders,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ claimed_for_tier: preferredTier }),
        signal: controller.signal,
      },
    );

    const payload = (await response.json()) as any;

    if (response.status === 409) {
      throw new ClaimConflictError(
        payload.message ?? "Batch ini sudah diklaim oleh simpul lain (409 Conflict).",
      );
    }

    if (!response.ok || (!payload.claim && !payload.claim_id)) {
      throw new Error(
        payload.message ?? `Gagal mengklaim batch (${response.status}).`,
      );
    }

    const claim: RescueClaim = {
      id: payload.claim_id ?? payload.claim?.id ?? `claim-${Date.now()}`,
      batch_id: payload.batch_id ?? input.batchId,
      receiver_id: input.actorHeaders["x-actor-id"],
      claimed_for_tier: payload.claimed_for_tier ?? preferredTier,
      status: payload.status ?? ClaimStatus.ACTIVE_EN_ROUTE,
      qr_token_hash: payload.qr_token ?? payload.claim?.qr_token_hash ?? "",
      qr_expires_at: payload.qr_expires_at ?? payload.claim?.qr_expires_at ?? new Date(Date.now() + 45 * 60_000).toISOString(),
      claimed_at: new Date().toISOString(),
      handover_scanned_at: null,
      handover_ambient_temp_c: null,
      handover_scan_location: null,
      liability_waiver_accepted: true,
      waiver_signature_hash: null,
      revocation_reason: null,
      updated_at: new Date().toISOString(),
    };

    const batch = await fetchBatchDetail(input.batchId, input.actorHeaders);
    batch.active_claim = claim;
    if (payload.pickup_instructions?.handover_point_notes) {
      batch.handover_point_notes = payload.pickup_instructions.handover_point_notes;
    }
    return { claim, batch };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNearbyBatches(
  role: FieldRole,
  actorHeaders: ActorHeaders,
  radiusMeters = 50000,
  coords = { latitude: -6.8863, longitude: 107.6080 },
): Promise<BatchWithItems[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `${env.apiUrl}/api/v1/batches/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radius_m=${radiusMeters}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...actorHeaders,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Gagal mengambil batch sekitar (${response.status}).`);
    }

    const payload = (await response.json()) as any;
    const rawList = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.batches)
        ? payload.batches
        : [];

    const seen = new Set<string>();
    const result: BatchWithItems[] = [];
    for (const item of rawList) {
      if (item?.id && !seen.has(item.id)) {
        seen.add(item.id);
        result.push(normalizeRawBatch(item));
      }
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBatchDetail(
  batchId: string,
  actorHeaders: ActorHeaders,
): Promise<BatchWithItems> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${env.apiUrl}/api/v1/batches/${batchId}`, {
      method: "GET",
      headers: {
        ...actorHeaders,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Batch dengan ID '${batchId}' tidak ditemukan di sistem.`);
    }

    const raw = (await response.json()) as any;
    return normalizeRawBatch(raw);
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyHandoverApi(
  input: VerifyHandoverInput,
): Promise<VerifyHandoverResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${env.apiUrl}/api/v1/batches/${input.batchId}/verify-handover`,
      {
        method: "POST",
        headers: {
          ...input.actorHeaders,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          qr_token: input.qrToken,
          handover_ambient_temp_c: input.handoverAmbientTempC ?? 30.0,
          liability_waiver_accepted: true,
        }),
        signal: controller.signal,
      },
    );

    const payload = (await response.json()) as any;

    if (response.status === 422) {
      throw new SafetyInvariantError(
        payload.message ??
          "Batas aman konsumsi manusia terlampaui. Klaim manusia dibatalkan dan dialihkan ke pakan ternak (422 Unprocessable Entity).",
      );
    }

    if (!response.ok) {
      throw new HandoverVerificationError(
        payload.message ?? `Verifikasi serah terima gagal (${response.status}).`,
        response.status,
      );
    }

    const waiverCertNo =
      payload.digital_liability_waiver?.certificate_no ??
      payload.waiver_certificate_no ??
      `SRK-ESG-${Date.now()}`;

    const claim: RescueClaim = {
      id: payload.claim_id ?? input.claimId,
      batch_id: payload.batch_id ?? input.batchId,
      receiver_id: "receiver-verified",
      claimed_for_tier: "TIER_1_HUMAN",
      status: ClaimStatus.HANDOVER_COMPLETED,
      qr_token_hash: input.qrToken,
      qr_expires_at: new Date(Date.now() + 3600_000).toISOString(),
      claimed_at: new Date().toISOString(),
      handover_scanned_at: payload.digital_liability_waiver?.handover_scanned_at ?? input.scannedAt,
      handover_ambient_temp_c: input.handoverAmbientTempC ?? 30.0,
      handover_scan_location: input.location ?? null,
      liability_waiver_accepted: true,
      waiver_signature_hash: payload.digital_liability_waiver?.waiver_signature_hash ?? input.waiverSignatureHash,
      revocation_reason: null,
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      batch_id: input.batchId,
      claim,
      waiver_certificate_no: waiverCertNo,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export interface TimeWarpOptions {
  batchId: string;
  overrideTempC?: number;
  forceExpireTier1?: boolean;
  forceExpireTier2?: boolean;
  notes?: string;
  actorHeaders?: ActorHeaders;
}

export async function timeWarpSimulation(
  options: TimeWarpOptions,
): Promise<{ batch_id: string; message: string; simulated_action?: string; new_state?: string }> {
  const token = useActorStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-actor-role": "SIMULATOR_ADMIN",
    "x-actor-id": "f0000000-0000-0000-0000-000000000001",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.actorHeaders || {}),
  };

  const body: Record<string, any> = {
    batch_id: options.batchId,
    notes: options.notes ?? "Simulasi Time-Warp God-Mode Mobile",
  };
  if (typeof options.overrideTempC === "number") {
    body.override_temp_c = options.overrideTempC;
  }
  if (options.forceExpireTier1) {
    body.force_expire_tier1 = true;
  }
  if (options.forceExpireTier2) {
    body.force_expire_tier2 = true;
  }

  const res = await fetch(`${env.apiUrl}/api/v1/simulation/time-warp`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(payload.message ?? `Simulasi gagal (${res.status}).`);
  }
  return payload;
}

export async function triggerGodModeSimulation(
  batchId: string,
  simTempC = 38.0,
): Promise<void> {
  await timeWarpSimulation({
    batchId,
    overrideTempC: simTempC,
  });
}
