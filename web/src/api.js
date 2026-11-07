const API_BASE = (typeof window !== "undefined" && window.__SIRKULA_ENV__?.API_BASE_URL)
  ? window.__SIRKULA_ENV__.API_BASE_URL
  : (typeof window !== "undefined" && window.location?.hostname)
  ? `${window.location.protocol}//${window.location.hostname}:4000`
  : "http://localhost:4000";

export const ACTOR_ALIAS_MAP = {
  "actor-donor": "a0000000-0000-0000-0000-000000000001",
  "actor-hub": "b0000000-0000-0000-0000-000000000001",
  "actor-farmer": "c0000000-0000-0000-0000-000000000001",
  "actor-compost": "d0000000-0000-0000-0000-000000000001",
  "actor-auditor": "e0000000-0000-0000-0000-000000000001",
  "actor-admin": "f0000000-0000-0000-0000-000000000001"
};

let currentToken = (typeof localStorage !== "undefined" && localStorage?.getItem?.("sirkula.token")) || "";
let currentActorId = (typeof localStorage !== "undefined" && localStorage?.getItem?.("sirkula.actorId")) || "a0000000-0000-0000-0000-000000000001";
let currentRole = (typeof localStorage !== "undefined" && localStorage?.getItem?.("sirkula.role")) || "DONOR";

export function setApiSession(token, actorId, role) {
  currentToken = token || "";
  currentActorId = actorId || "";
  currentRole = role || "";
  try {
    if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem?.("sirkula.token", token);
      else localStorage.removeItem?.("sirkula.token");
      if (actorId) localStorage.setItem?.("sirkula.actorId", actorId);
      else localStorage.removeItem?.("sirkula.actorId");
      if (role) localStorage.setItem?.("sirkula.role", role);
      else localStorage.removeItem?.("sirkula.role");
    }
  } catch {
    // silent fallback
  }
}

export function getApiSession() {
  return { token: currentToken, actorId: currentActorId, role: currentRole };
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };

  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }
  if (currentActorId) {
    headers["x-actor-id"] = ACTOR_ALIAS_MAP[currentActorId] || currentActorId;
  }
  if (currentRole) {
    headers["x-actor-role"] = currentRole;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || response.statusText || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth & Actors
  async getActors() {
    return request("/api/v1/auth/actors");
  },
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/actors`, { method: "HEAD", signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },
  async getActorById(id) {
    return request(`/api/v1/auth/actors/${encodeURIComponent(id)}`);
  },
  async register(actorData) {
    return request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(actorData)
    });
  },
  async login(credentials) {
    return request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
  },
  async createToken(actorId) {
    return request("/api/v1/auth/token", {
      method: "POST",
      body: JSON.stringify({ actor_id: actorId })
    });
  },

  // Food Batches
  async getNearbyBatches(params = {}) {
    const query = new URLSearchParams();
    if (params.latitude !== undefined) query.set("latitude", params.latitude);
    if (params.longitude !== undefined) query.set("longitude", params.longitude);
    if (params.radius_m !== undefined) query.set("radius_m", params.radius_m);
    return request(`/api/v1/batches/nearby?${query.toString()}`);
  },
  async getBatchById(id) {
    return request(`/api/v1/batches/${encodeURIComponent(id)}`);
  },
  async createBatch(formData) {
    return request("/api/v1/batches/analyze-and-create", {
      method: "POST",
      body: formData
    });
  },

  // Claims & Handover
  async claimBatch(id, body = {}) {
    return request(`/api/v1/batches/${encodeURIComponent(id)}/claim`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },
  async verifyHandover(id, body) {
    return request(`/api/v1/batches/${encodeURIComponent(id)}/verify-handover`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  // God-Mode Simulation
  async timeWarp(body) {
    return request("/api/v1/simulation/time-warp", {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  // ESG Analytics
  async getEsgSummary() {
    return request("/api/v1/analytics/esg-summary");
  },

  // Weather Telemetry
  async getWeather(lat, lon) {
    const query = new URLSearchParams();
    if (lat !== undefined) query.set("latitude", lat);
    if (lon !== undefined) query.set("longitude", lon);
    return request(`/api/v1/weather/telemetry?${query.toString()}`);
  }
};
