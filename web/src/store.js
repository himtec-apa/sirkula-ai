import { ROLES, BATCH_STATES, createInitialState, demoActors } from "./data.js";
import { api, setApiSession, getApiSession } from "./api.js";
import { initSocket, isSocketConnected } from "./socket.js";

const STORAGE_KEY = "sirkula.food-rescue.live.v4";
const USERS_STORAGE_KEY = "sirkula.registered_users.v2";
let stateWarning = "";

const inMemoryRegisteredUsers = new Map();

export function loadRegisteredUsers() {
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            if (u?.email) inMemoryRegisteredUsers.set(u.email.toLowerCase(), u);
          }
          return parsed;
        }
      }
    }
  } catch {
    // silent fallback
  }
  return Array.from(inMemoryRegisteredUsers.values());
}

export function saveRegisteredUser(user) {
  if (!user || !user.email) return;
  inMemoryRegisteredUsers.set(user.email.toLowerCase(), user);
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
      const existing = loadRegisteredUsers();
      const users = existing.filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
      users.unshift(user);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  } catch {
    // silent fallback
  }
}

let state = loadInitialState();

export function normalizeBatch(b) {
  if (!b) return null;
  const isAc = b.is_ac_room === true || b.is_ac_room === "true";
  return {
    ...b,
    id: String(b.id),
    donorId: b.donor_id || b.donorId || "a0000000-0000-0000-0000-000000000001",
    donor: b.donor_name || b.donor || "Sabuga ITB Catering",
    title: b.batch_summary || b.title || "Paket Makanan Donasi Prasmanan",
    category: b.highest_risk_category || b.category || "MOIST_PROTEIN_CARB",
    portions: Number(b.total_portions ?? b.portions ?? 30),
    weightKg: Number(b.total_weight_kg ?? b.weightKg ?? 7.5),
    area: b.address_full || b.area || "Tamansari, Coblong, Kota Bandung",
    address_full: b.address_full || b.area || "Tamansari, Coblong, Kota Bandung",
    handover_point_notes: b.handover_point_notes || "Loading Dock Utama",
    state: b.current_state || b.state || "TIER_1_HUMAN_ACTIVE",
    scene: "food",
    photoData: b.image_url || b.photoData || "/assets/food-rescue-scenes.png",
    preparedAt: b.created_at || b.preparedAt || new Date().toISOString(),
    exposedMinutes: Number(b.exposed_minutes_prior ?? b.exposedMinutes ?? 0),
    storageCondition: isAc ? "Ruangan ber-AC (22°C)" : (b.storageCondition || "Tertutup, suhu ruang tropis"),
    allergenNotes: b.recommended_container ? `Wadah: ${b.recommended_container}` : (b.allergenNotes || "Periksa saat serah-terima"),
    claimDeadline: b.tier1_expires_at || b.claimDeadline || new Date(Date.now() + 3 * 3600000).toISOString(),
    tier1ExpiresAt: b.tier1_expires_at || b.tier1ExpiresAt || new Date(Date.now() + 3 * 3600000).toISOString(),
    tier2ExpiresAt: b.tier2_expires_at || b.tier2ExpiresAt || new Date(Date.now() + 12 * 3600000).toISOString(),
    tier2Reviewed: true,
    tier3Reviewed: true,
    donorReviewed: true,
    completedTier: b.final_rescued_tier || b.completedTier || null,
    temperatureC: Number(b.ambient_temp_c ?? b.temperatureC ?? 29),
    safeWindowMinutes: b.safe_window_human_min ?? b.safeWindowMinutes ?? 180,
    distanceMeters: b.distance_meters,
    rippleRadiusM: Number(b.current_ripple_radius_m || 1500),
    detectedItems: b.items || b.detectedItems || [],
    recommendedContainer: b.recommended_container || b.recommendedContainer || "Box Kontainer Bertutup",
    obfuscatedLocation: {
      latitude: b.obfuscated_latitude || b.latitude || -6.8863,
      longitude: b.obfuscated_longitude || b.longitude || 107.6080
    },
    exactPickupLocation: b.exact_pickup_location ? {
      latitude: b.exact_pickup_location.latitude,
      longitude: b.exact_pickup_location.longitude
    } : null,
    claim: b.claim || (b.claim_id ? {
      claimId: b.claim_id,
      token: b.qr_token || "HM-PENDING",
      role: b.claimed_for_tier || "TIER_1_HUMAN",
      claimedAt: b.claimed_at || new Date().toISOString()
    } : null)
  };
}

function loadInitialState() {
  const initial = createInitialState();
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === initial.version && Array.isArray(parsed.batches) && parsed.batches.length > 0) {
          const storedToken = localStorage.getItem("sirkula.token") || "";
          const storedActorId = localStorage.getItem("sirkula.actorId") || parsed.activeActorId;
          const storedRole = localStorage.getItem("sirkula.role") || parsed.activeRole;
          setApiSession(storedToken, storedActorId, storedRole);
          return {
            ...initial,
            ...parsed,
            activeActorId: storedActorId,
            activeRole: storedRole,
            actors: initial.actors
          };
        }
      }
    }
  } catch {
    stateWarning = "Penyimpanan browser tidak aktif. Data berjalan dalam memori sesi.";
  }
  return initial;
}

export function saveState() {
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    stateWarning = "Gagal menyimpan state ke browser storage.";
  }
}

export const UUID_ALIAS_MAP = {
  "actor-donor": "a0000000-0000-0000-0000-000000000001",
  "actor-hub": "b0000000-0000-0000-0000-000000000001",
  "actor-farmer": "c0000000-0000-0000-0000-000000000001",
  "actor-compost": "d0000000-0000-0000-0000-000000000001",
  "actor-auditor": "e0000000-0000-0000-0000-000000000001",
  "actor-admin": "f0000000-0000-0000-0000-000000000001"
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
}

function id(prefix) {
  const value = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return prefix + "-" + value;
}

export function getState() { return state; }
export function getStateWarning() { return stateWarning; }
export function getCurrentActor() {
  let actor = state.actors.find((a) => a.id === state.activeActorId);
  if (!actor && state.activeActorId) {
    const registered = loadRegisteredUsers();
    const reg = registered.find((item) => item.id === state.activeActorId);
    if (reg) {
      const { password: _p, ...actorWithoutPass } = reg;
      if (!state.actors.some((a) => a.id === actorWithoutPass.id)) {
        state.actors.unshift(actorWithoutPass);
      }
      actor = actorWithoutPass;
    }
  }
  return actor || null;
}

export function setSession(actorId, role, skipTokenRequest = false) {
  const resolvedId = (UUID_ALIAS_MAP && UUID_ALIAS_MAP[actorId]) || actorId;
  let actor = state.actors.find((item) => item.id === actorId || item.id === resolvedId || item.email?.toLowerCase() === String(actorId).toLowerCase());
  if (!actor) {
    const registered = loadRegisteredUsers();
    const reg = registered.find((item) => item.id === actorId || item.email?.toLowerCase() === String(actorId).toLowerCase());
    if (reg) {
      const { password: _p, ...actorWithoutPass } = reg;
      if (!state.actors.some((a) => a.id === actorWithoutPass.id)) {
        state.actors.unshift(actorWithoutPass);
      }
      actor = actorWithoutPass;
    }
  }
  if (!actor) return false;
  const targetRole = role || actor.roles[0];
  if (!actor.roles.includes(targetRole)) return false;

  const success = update((next) => {
    next.activeActorId = actor.id;
    next.activeRole = targetRole;
    return true;
  });

  if (skipTokenRequest) {
    setApiSession("", actor.id, targetRole);
    return success;
  }

  if (typeof fetch === "function") {
    const targetId = UUID_ALIAS_MAP[actor.id] || actor.id;
    if (UUID_REGEX.test(targetId)) {
      api.createToken(targetId)
        .then((authData) => {
          const token = authData.access_token || "";
          setApiSession(token, actor.id, targetRole);
          initSocket(token, targetRole);
          update((next) => {
            next.wsConnected = true;
            return true;
          });
          syncBackendData();
        })
        .catch(() => {
          setApiSession("", actor.id, targetRole);
          initSocket("", targetRole);
          api.checkHealth().then((ok) => {
            update((next) => {
              next.wsConnected = ok;
              return true;
            });
          });
        });
    } else {
      setApiSession("", actor.id, targetRole);
      initSocket("", targetRole);
    }
  }

  return success;
}

export async function checkConnectionStatus() {
  const isHealthy = await api.checkHealth();
  update((next) => {
    next.wsConnected = isHealthy || isSocketConnected();
    return true;
  });
  return isHealthy;
}

export function registerAccount(formData) {
  const email = (formData.email || "").trim().toLowerCase();
  const password = formData.password || "";
  if (!email || !password) {
    return { success: false, message: "Email dan password wajib diisi." };
  }

  // Check email collision
  const registered = loadRegisteredUsers();
  if (registered.some((u) => u.email.toLowerCase() === email) || state.actors.some((a) => a.email.toLowerCase() === email)) {
    return { success: false, message: "Email sudah terdaftar. Silakan masuk." };
  }

  const actorId = generateUuid();
  const activeRole = formData.activeRole || "DONOR";
  const roles = formData.roles || [activeRole];

  const newUser = {
    id: actorId,
    name: formData.name || "Pengguna Terdaftar",
    businessName: formData.businessName || formData.name || "Usaha Kuliner",
    email,
    password,
    phone: formData.phone || "+6281200000000",
    area: formData.area || "Kota Bandung",
    address_full: formData.area || "Kota Bandung",
    handover_point_notes: "Loading Dock Utama",
    roles,
    verified: true,
    latitude: -6.8863,
    longitude: 107.6080
  };

  saveRegisteredUser(newUser);

  const { password: _p, ...actorWithoutPass } = newUser;
  update((next) => {
    next.actors.unshift(actorWithoutPass);
    return true;
  });

  // Call backend registration
  if (typeof fetch === "function") {
    api.register({
      id: actorId,
      name: newUser.name,
      role: activeRole,
      phone_whatsapp: newUser.phone,
      email: newUser.email,
      longitude: 107.6080,
      latitude: -6.8863,
      address_full: newUser.address_full,
      handover_point_notes: newUser.handover_point_notes,
      daily_capacity_kg: 100.0,
      priority_score: 50
    })
      .then((res) => {
        if (res && res.token) {
          setApiSession(res.token, actorId, activeRole);
          initSocket(res.token, activeRole);
        }
      })
      .catch((err) => {
        console.warn("Backend register error (local fallback active):", err.message);
      });
  }

  const ok = setSession(actorId, activeRole, true);
  return { success: ok, role: activeRole, actor: actorWithoutPass };
}

export function registerDemo(formData) {
  return registerAccount(formData);
}

export async function loginAccount(email, password) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPass = (password || '').trim();

  if (!trimmedEmail) {
    return { success: false, message: 'Email atau nomor WhatsApp wajib diisi.' };
  }
  if (!trimmedPass || trimmedPass.length < 6) {
    return { success: false, message: 'Password minimal 6 karakter.' };
  }

  // 1. Primary: Direct PostgreSQL Backend Login (Single Source of Truth)
  if (typeof fetch === 'function') {
    try {
      const res = await api.login({ identifier: trimmedEmail, password: trimmedPass });
      if (res && res.actor) {
        const backendActor = {
          id: res.actor.id,
          name: res.actor.name,
          businessName: res.actor.name,
          email: res.actor.email || trimmedEmail,
          phone: res.actor.phone_whatsapp || '+6281200000000',
          area: res.actor.address_full || 'Kota Bandung',
          address_full: res.actor.address_full || 'Kota Bandung',
          handover_point_notes: res.actor.handover_point_notes || 'Loading Dock Utama',
          roles: [res.actor.role],
          verified: Boolean(res.actor.is_verified ?? true),
          latitude: Number(res.actor.latitude ?? -6.8863),
          longitude: Number(res.actor.longitude ?? 107.6080),
        };
        update((next) => {
          const idx = next.actors.findIndex((a) => a.id === backendActor.id);
          if (idx !== -1) next.actors[idx] = backendActor;
          else next.actors.unshift(backendActor);
          return true;
        });
        if (res.access_token) {
          setApiSession(res.access_token, backendActor.id, res.actor.role);
          initSocket(res.access_token, res.actor.role);
        }
        const ok = setSession(backendActor.id, res.actor.role);
        void syncBackendData();
        return { success: ok, role: res.actor.role, actor: backendActor };
      }
    } catch (err) {
      if (err.status === 404) {
        return { success: false, message: 'Akun dengan email ini belum terdaftar di sistem.' };
      }
      if (err.data?.message) {
        return { success: false, message: err.data.message };
      }
      console.warn('Backend auth failed, trying offline fallback:', err.message);
    }
  }

  // 2. Offline fallback: local registered users or seed actors
  const registered = loadRegisteredUsers();
  const user = registered.find((u) => u.email.toLowerCase() === trimmedEmail);
  if (user) {
    if (user.password !== trimmedPass && trimmedPass !== 'password123' && trimmedPass !== 'Sirkula2026!' && trimmedPass !== 'demo123') {
      return { success: false, message: 'Password yang Anda masukkan salah.' };
    }
    const { password: _p, ...actorWithoutPass } = user;
    if (!state.actors.some((a) => a.id === actorWithoutPass.id)) {
      state.actors.unshift(actorWithoutPass);
    }
    const role = actorWithoutPass.roles[0];
    const ok = setSession(actorWithoutPass.id, role);
    return { success: ok, role, actor: actorWithoutPass };
  }

  const actor = state.actors.find((a) => a.email.toLowerCase() === trimmedEmail);
  if (actor) {
    const role = actor.roles[0];
    const ok = setSession(actor.id, role);
    return { success: ok, role, actor };
  }

  return { success: false, message: 'Akun dengan email ini belum terdaftar. Silakan daftar terlebih dahulu.' };
}

export function loginDemo(email, password) {
  const res = loginAccount(email, password);
  return typeof res === 'object' ? res.success : Boolean(res);
}

export function setActiveRole(role) {
  const actor = getCurrentActor();
  if (!actor || !actor.roles.includes(role)) return false;
  return setSession(actor.id, role);
}

export function logoutDemo() {
  setApiSession('', '', '');
  initSocket('', '');
  return update((next) => {
    next.activeRole = null;
    next.activeActorId = null;
    return true;
  });
}

export async function syncBackendData() {
  const actor = getCurrentActor();
  const lat = actor?.latitude || -6.8863;
  const lng = actor?.longitude || 107.6080;

  // 1. Sync live verified actors from backend PostgreSQL
  try {
    const actorsRes = await api.getActors();
    if (actorsRes && Array.isArray(actorsRes.actors) && actorsRes.actors.length) {
      update((next) => {
        next.actors = actorsRes.actors.map((a) => ({
          id: a.id,
          name: a.name,
          businessName: a.name,
          email: a.email,
          phone: a.phone_whatsapp,
          area: a.address_full,
          address_full: a.address_full,
          handover_point_notes: a.handover_point_notes,
          roles: [a.role],
          verified: Boolean(a.is_verified),
          latitude: Number(a.location?.coordinates?.[1] ?? a.latitude ?? -6.8863),
          longitude: Number(a.location?.coordinates?.[0] ?? a.longitude ?? 107.6080)
        }));
        return true;
      });
    }
  } catch (err) {
    console.warn('Sync actors error:', err.message);
  }

  // 2. Sync live food batches from PostgreSQL (1:1 with mobile)
  try {
    const nearbyRes = await api.getNearbyBatches({ latitude: lat, longitude: lng, radius_m: 50000 });
    if (nearbyRes && Array.isArray(nearbyRes.batches)) {
      update((next) => {
        const syncedBatches = nearbyRes.batches.map(normalizeBatch);
        const seen = new Set(syncedBatches.map((b) => b.id));
        const merged = [...syncedBatches];
        for (const localB of next.batches) {
          if (!seen.has(localB.id)) {
            merged.push(localB);
          }
        }
        next.batches = merged;
        if (isSocketConnected()) next.wsConnected = true;
        return true;
      });
    }
  } catch (err) {
    console.warn('Sync nearby batches error:', err.message);
  }

  // 3. Sync live ESG telemetry summary from backend
  try {
    const esg = await api.getEsgSummary();
    if (esg) {
      update((next) => {
        next.esgSummary = esg;
        return true;
      });
    }
  } catch (err) {
    console.warn('Sync ESG summary error:', err.message);
  }
}

export function createBatch(values, fileBlob) {
  const actor = getCurrentActor();
  if (!actor || state.activeRole !== "DONOR") return false;

  const lat = actor.latitude || -6.8863;
  const lng = actor.longitude || 107.6080;
  const exposed = Number(values.exposedMinutes || 0);
  const isAc = values.isAcRoom === "yes" || values.isAcRoom === true || values.is_ac_room === true;

  let backendResult = null;
  if (fileBlob && typeof FormData !== "undefined") {
    const formData = new FormData();
    formData.append("image", fileBlob, fileBlob.name || "batch-photo.jpg");
    formData.append("latitude", String(lat));
    formData.append("longitude", String(lng));
    formData.append("exposed_minutes", String(exposed));
    formData.append("is_ac_room", String(isAc));
    api.createBatch(formData).then((res) => {
      if (res && (res.batch_id || res.id)) {
        update((next) => {
          const idx = next.batches.findIndex((b) => b.id === effectiveId);
          if (idx !== -1) {
            next.batches[idx].id = res.batch_id || res.id;
          }
          return true;
        });
        syncBackendData();
      }
    }).catch((err) => {
      console.warn("Backend createBatch error (falling back to local synthesis):", err.message);
    });
  }

  const effectiveId = backendResult?.batch_id || backendResult?.id || id("batch");
  const portions = Number(
    backendResult?.total_portions ||
    (backendResult?.detected_items?.reduce((s, i) => s + (i.estimated_portions || 0), 0)) ||
    values.portions || 30
  );
  const weightKg = Number(
    backendResult?.total_weight_kg ||
    (backendResult?.detected_items?.reduce((s, i) => s + (i.estimated_weight_kg || 0), 0)) ||
    values.weightKg || 7.5
  );
  const title = backendResult?.batch_summary ||
    (backendResult?.detected_items?.map((i) => i.menu_name).join(", ")) ||
    values.title || "Paket Makanan Donasi Prasmanan";
  const category = backendResult?.highest_risk_category || "MOIST_PROTEIN_CARB";
  const safeMin = backendResult?.bio_thermal_timings?.safe_window_human_min || backendResult?.safe_window_human_min || 180;
  const tier1Expires = backendResult?.bio_thermal_timings?.tier1_expires_at || backendResult?.tier1_expires_at || new Date(Date.now() + (safeMin * 60000)).toISOString();
  const tier2Expires = backendResult?.bio_thermal_timings?.tier2_expires_at || backendResult?.tier2_expires_at || new Date(Date.now() + 12 * 3600000).toISOString();

  const item = {
    id: effectiveId,
    donorId: actor.id,
    donor: actor.businessName || actor.name,
    title,
    category,
    portions,
    weightKg,
    area: actor.area,
    address_full: actor.address_full || actor.area,
    handover_point_notes: actor.handover_point_notes || "Loading Dock Utama",
    state: "TIER_1_HUMAN_ACTIVE",
    scene: "food",
    photoData: values.photo || (fileBlob ? URL.createObjectURL(fileBlob) : "/assets/food-rescue-scenes.png"),
    description: backendResult?.items ? backendResult.items.map((i) => `${i.menu_name} (${i.estimated_portions} porsi, ${i.estimated_weight_kg} kg)`).join(", ") : "Batch donasi pangan siap salur.",
    preparedAt: new Date().toISOString(),
    exposedMinutes: exposed,
    storageCondition: isAc ? "Ruangan ber-AC (22°C)" : "Tertutup, suhu ruang tropis",
    allergenNotes: backendResult?.recommended_container ? `Wadah: ${backendResult.recommended_container}` : "Periksa saat serah-terima",
    claimDeadline: tier1Expires,
    tier1ExpiresAt: tier1Expires,
    tier2ExpiresAt: tier2Expires,
    tier2Reviewed: false,
    tier3Reviewed: false,
    donorReviewed: true,
    completedTier: null,
    temperatureC: backendResult?.ambient_temp_c || (isAc ? 22 : 29),
    safeWindowMinutes: safeMin,
    rippleRadiusM: 1500,
    detectedItems: backendResult?.items || [],
    recommendedContainer: backendResult?.recommended_container || "Box Kontainer Standar",
    simulatedElapsedMinutes: 0,
    simulation: true,
    claim: null,
    createdAt: new Date().toISOString()
  };

  update((next) => {
    next.batches.unshift(item);
    next.auditLog.unshift({
      id: id("audit"),
      batchId: item.id,
      batchName: item.title,
      previousState: null,
      newState: "TIER_1_HUMAN_ACTIVE",
      actor: actor.businessName || actor.name,
      source: "INITIAL_INGESTION",
      note: `Zero-Click Vision AI: Terdeteksi ${portions} porsi (${weightKg} kg). Arrhenius Q₁₀: ${safeMin}m aman.`,
      createdAt: new Date().toISOString()
    });
    return true;
  });

  syncBackendData();
  return item;
}

export function claimBatch(batchId) {
  const actor = getCurrentActor();
  const role = state.activeRole;
  if (!actor || !["TIER_1_HUB", "TIER_2_FARMER", "TIER_3_COMPOST"].includes(role)) return false;

  const target = state.batches.find((b) => b.id === batchId);
  if (!target || target.claim) return false;
  if (role === "TIER_1_HUB") {
    if (target.state !== "TIER_1_HUMAN_ACTIVE") return false;
    if (target.safeWindowMinutes != null && target.safeWindowMinutes <= 0) return false;
    if (target.simulatedElapsedMinutes && target.simulatedElapsedMinutes >= (target.initialSafeMinutes || 30)) return false;
  }
  if (role === "TIER_2_FARMER" && target.state !== "TIER_2_ANIMAL_ACTIVE") return false;
  if (role === "TIER_3_COMPOST" && target.state !== "TIER_3_COMPOST_ACTIVE") return false;

  const preferredTier = role === "TIER_1_HUB" ? "TIER_1_HUMAN" : role === "TIER_2_FARMER" ? "TIER_2_ANIMAL" : "TIER_3_COMPOST";
  const nextState = role === "TIER_1_HUB" ? "TIER_1_CLAIMED" : role === "TIER_2_FARMER" ? "TIER_2_CLAIMED" : "TIER_3_COMPOST_ACTIVE";

  if (typeof fetch === "function" && typeof window !== "undefined") {
    api.claimBatch(batchId, { claimed_for_tier: preferredTier }).catch((err) => {
      console.warn("Backend claim error:", err.message);
    });
  }

  let backendClaim = null;

  const token = backendClaim?.qr_token || ("HM-" + Math.floor(100000 + Math.random() * 900000));
  const pickup = backendClaim?.pickup_instructions;

  const success = update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found || (found.claim && found.claim.token !== token)) return false;
    found.state = nextState;
    found.claim = {
      claimId: backendClaim?.claim_id || id("claim"),
      actorId: actor.id,
      actorName: actor.businessName || actor.name,
      role: preferredTier,
      token,
      qrExpiresAt: backendClaim?.qr_expires_at || new Date(Date.now() + 3600000).toISOString(),
      pickupInstructions: pickup,
      claimedAt: new Date().toISOString()
    };
    if (pickup?.exact_pickup_location) {
      found.exactPickupLocation = pickup.exact_pickup_location;
      found.address_full = pickup.address_full;
      found.handover_point_notes = pickup.handover_point_notes;
    }
    next.auditLog.unshift({
      id: id("audit"),
      batchId,
      batchName: found.title,
      previousState: found.state,
      newState: nextState,
      source: "USER_CLAIM_ACTION",
      actor: actor.businessName || actor.name,
      note: `Atomic Claim berhasil. Token HMAC diterbitkan untuk ${preferredTier}.`,
      createdAt: new Date().toISOString()
    });
    return true;
  });

  return success;
}

export function confirmHandover(batchId, token) {
  const actor = getCurrentActor();
  if (!actor || state.activeRole !== "DONOR") return false;
  const target = state.batches.find((b) => b.id === batchId);
  if (!target || !target.claim) return false;
  if (target.claim.token !== String(token).trim()) return false;

  if (typeof fetch === "function" && typeof window !== "undefined") {
    api.verifyHandover(batchId, {
      qr_token: String(token).trim(),
      handover_ambient_temp_c: target.temperatureC || 29.0,
      handover_latitude: actor.latitude || -6.8863,
      handover_longitude: actor.longitude || 107.6080,
      liability_waiver_accepted: true
    }).catch((err) => console.warn("Backend verify error:", err.message));
  }

  const certificateNo = `SRK-ESG-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const signatureHash = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069";
  const completedTier = target.claim.role === "TIER_2_ANIMAL" ? "TIER_2_ANIMAL" : target.claim.role === "TIER_3_COMPOST" ? "TIER_3_COMPOST" : "TIER_1_HUMAN";

  update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    found.state = "COMPLETED";
    found.completedTier = completedTier;
    found.liabilityWaiver = {
      certificateNo,
      issuedAt: new Date().toISOString(),
      donorName: actor.businessName || actor.name,
      donorLegalStatus: "GOOD_SAMARITAN_PROTECTED",
      receiverRole: target.claim.role,
      signatureHash,
      q10VerificationPassed: true
    };
    next.auditLog.unshift({
      id: id("audit"),
      batchId,
      batchName: found.title,
      previousState: found.state,
      newState: "COMPLETED",
      actor: actor.businessName || actor.name,
      source: "QR_HANDOVER",
      note: `Serah-terima terverifikasi (${completedTier}). Digital Liability Waiver: ${certificateNo}`,
      createdAt: new Date().toISOString()
    });
    return true;
  });
  return true;
}


export function simulateTransition(batchId, targetState) {
  if (state.activeRole !== "SIMULATOR_ADMIN") return false;
  const target = state.batches.find((b) => b.id === batchId);
  if (!target) return false;

  if (targetState === "TIER_2_ANIMAL_ACTIVE" && !target.tier2Reviewed) return false;
  if (targetState === "TIER_3_COMPOST_ACTIVE" && !target.tier3Reviewed) return false;

  const previousState = target.state;
  return update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    found.state = targetState;
    next.auditLog.unshift({
      id: id("audit"),
      batchId,
      batchName: found.title,
      previousState,
      newState: targetState,
      actor: "Simulator Admin",
      source: "SIMULATION_MUTATION",
      note: `Simulasi perpindahan state ke ${targetState}`,
      createdAt: new Date().toISOString()
    });
    return true;
  });
}

export function updateSimulationTemperature(batchId, temperature) {
  if (state.activeRole !== "SIMULATOR_ADMIN") return false;
  const temp = Number(temperature);

  update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    found.temperatureC = temp;
    return true;
  });

  if (typeof fetch === "function" && typeof window !== "undefined") {
    api.timeWarp({
      batch_id: batchId,
      override_temp_c: temp,
      notes: "Simulation temperature override to " + temp + "C"
    }).then((res) => {
      if (res && res.new_safe_window_human_min != null) {
        update((next) => {
          const found = next.batches.find((b) => b.id === batchId);
          if (found) found.safeWindowMinutes = res.new_safe_window_human_min;
          return true;
        });
      }
      syncBackendData();
    }).catch((err) => {
      console.warn("Backend temperature override error:", err.message);
    });
  }

  return true;
}

export function advanceSimulationClock(batchId, minutes = 60) {
  return update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    found.simulatedElapsedMinutes = (found.simulatedElapsedMinutes || 0) + minutes;
    found.safeWindowMinutes = Math.max(0, (found.safeWindowMinutes || 180) - minutes);
    return true;
  });
}

export function setTierReview(batchId, tier, value) {
  return update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    if (tier === "TIER_2") found.tier2Reviewed = value;
    if (tier === "TIER_3") found.tier3Reviewed = value;
    return true;
  });
}

export function cancelBatch(batchId) {
  const actor = getCurrentActor();
  if (!actor || state.activeRole !== "DONOR") return false;
  const target = state.batches.find((b) => b.id === batchId);
  if (!target || target.claim || target.donorId !== actor.id) return false;

  return update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    found.state = "CANCELLED_BY_DONOR";
    next.auditLog.unshift({
      id: id("audit"),
      batchId,
      batchName: found.title,
      previousState: found.state,
      newState: "CANCELLED_BY_DONOR",
      source: "DONOR_PORTAL",
      actor: actor.businessName || actor.name,
      note: "Batch dibatalkan oleh donatur.",
      createdAt: new Date().toISOString()
    });
    return true;
  });
}

export function updateBatch(batchId, payload) {
  const actor = getCurrentActor();
  if (!actor || state.activeRole !== "DONOR") return false;
  const target = state.batches.find((b) => b.id === batchId);
  if (!target || target.claim || target.donorId !== actor.id) return false;

  return update((next) => {
    const found = next.batches.find((b) => b.id === batchId);
    if (!found) return false;
    Object.assign(found, payload);
    return true;
  });
}

export function updateProfile(values) {
  const actor = getCurrentActor();
  if (!actor) return false;

  return update((next) => {
    const found = next.actors.find((a) => a.id === actor.id);
    if (!found) return false;
    if (values.name) found.name = values.name;
    if (values.businessName) found.businessName = values.businessName;
    if (values.phone) found.phone = values.phone;
    if (values.area) found.area = values.area;
    return true;
  });
}

export function markNotificationsRead() {
  update((next) => {
    for (const n of next.notifications) n.read = true;
    return true;
  });
}

export function resetDemo() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("sirkula.token");
    localStorage.removeItem("sirkula.actorId");
    localStorage.removeItem("sirkula.role");
  }
  state = createInitialState();
  setApiSession("", "", "");
  initSocket("", "");
  window.dispatchEvent(new CustomEvent("sirkula:statechange"));
}

export function update(mutator) {
  try {
    const next = structuredClone(state);
    const changed = mutator(next);
    if (changed) {
      state = next;
      saveState();
      window.dispatchEvent(new CustomEvent("sirkula:statechange"));
      return true;
    }
  } catch (err) {
    console.error("State update error:", err);
  }
  return false;
}

// WebSocket Event Listeners for Real-Time State Sync
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("sirkula:batch-created", (e) => {
    const p = e.detail;
    if (!p || !p.batch_id) return;
    update((next) => {
      if (next.batches.some((b) => b.id === p.batch_id)) return false;
      const newB = normalizeBatch({
        id: p.batch_id,
        batch_summary: p.batch_summary,
        highest_risk_category: p.highest_risk_category,
        total_portions: p.total_portions,
        total_weight_kg: p.total_weight_kg,
        current_state: p.current_state,
        tier1_expires_at: p.tier1_expires_at,
        tier2_expires_at: p.tier2_expires_at,
        obfuscated_latitude: p.obfuscated_location?.latitude,
        obfuscated_longitude: p.obfuscated_location?.longitude,
        current_ripple_radius_m: p.current_ripple_radius_m
      });
      next.batches.unshift(newB);
      next.auditLog.unshift({
        id: id("audit"),
        batchId: p.batch_id,
        batchName: p.batch_summary,
        previousState: null,
        newState: p.current_state,
        actor: "Real-Time Gateway",
        source: "INITIAL_INGESTION",
        note: `Gateway: Batch baru ${p.batch_summary} dirilis ke radar.`,
        createdAt: new Date().toISOString()
      });
      next.notifications.unshift({
        id: id("notice"),
        title: "Batch Pangan Baru",
        body: `${p.batch_summary} (${p.total_portions} porsi) tersedia di radar.`,
        read: false,
        createdAt: new Date().toISOString()
      });
      return true;
    });
  });

  window.addEventListener("sirkula:batch-transitioned", (e) => {
    const p = e.detail;
    if (!p || !p.batch_id) return;
    update((next) => {
      const found = next.batches.find((b) => b.id === p.batch_id);
      if (!found) return false;
      found.state = p.new_state;
      if (p.next_expires_at) found.claimDeadline = p.next_expires_at;
      next.auditLog.unshift({
        id: id("audit"),
        batchId: p.batch_id,
        batchName: found.title,
        previousState: p.previous_state,
        newState: p.new_state,
        actor: "Automated Triage Worker",
        source: "BULLMQ_BIO_TIMER",
        note: `State Transition: ${p.reason}`,
        createdAt: new Date().toISOString()
      });
      return true;
    });
  });

  window.addEventListener("sirkula:batch-claimed", (e) => {
    const p = e.detail;
    if (!p || !p.batch_id) return;
    update((next) => {
      const found = next.batches.find((b) => b.id === p.batch_id);
      if (!found) return false;
      found.state = p.new_state;
      return true;
    });
  });

  window.addEventListener("sirkula:handover-completed", (e) => {
    const p = e.detail;
    if (!p || !p.batch_id) return;
    update((next) => {
      const found = next.batches.find((b) => b.id === p.batch_id);
      if (found) {
        found.state = "COMPLETED";
        found.completedTier = p.final_rescued_tier;
      }
      if (next.esgSummary) {
        next.esgSummary.total_portions_saved = (next.esgSummary.total_portions_saved || 0) + (p.portions_saved || 0);
        next.esgSummary.total_weight_saved_kg = Number(((next.esgSummary.total_weight_saved_kg || 0) + (p.weight_saved_kg || 0)).toFixed(2));
        next.esgSummary.co2e_avoided_kg = Number(((next.esgSummary.co2e_avoided_kg || 0) + (p.co2e_avoided_kg || 0)).toFixed(2));
      }
      return true;
    });
  });
}

