// SIRKULA-AI Geospatial Interactive Map Module
// Integrates Leaflet JS with PostGIS Coordinates, Obfuscation Ripples, and Dynamic Triage Markers

let mapInstance = null;
let currentMarkersLayer = null;
let currentCirclesLayer = null;

const TIER_COLORS = {
  TIER_1_HUMAN_ACTIVE: "#10B981",
  TIER_1_CLAIMED: "#0B7A6B",
  TIER_2_ANIMAL_ACTIVE: "#F59E0B",
  TIER_2_CLAIMED: "#D97706",
  TIER_3_COMPOST_ACTIVE: "#8B5CF6",
  TIER_3_COMPOST_CLAIMED: "#7C3AED",
  COMPLETED: "#059669",
  CANCELLED_BY_DONOR: "#94A3B8"
};

export function isLeafletAvailable() {
  return typeof window !== "undefined" && typeof window.L !== "undefined" && typeof window.L.map === "function";
}

export function destroyMap() {
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch {
      // ignore cleanup errors
    }
    mapInstance = null;
    currentMarkersLayer = null;
    currentCirclesLayer = null;
  }
}

export function initSirkulaMap(containerId, batches = [], activeRole = "DONOR", activeActor = null) {
  if (!isLeafletAvailable()) {
    console.warn("Leaflet library not loaded, using fallback schematic view.");
    return null;
  }

  const container = document.getElementById(containerId);
  if (!container) return null;

  // Cleanup existing map if attached to same container
  if (mapInstance) {
    destroyMap();
  }

  const defaultCenter = [-6.90389, 107.61861]; // Central Bandung

  try {
    const L = window.L;
    const map = L.map(containerId, {
      center: defaultCenter,
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: true
    });

    // Tile Provider resolver via window.__SIRKULA_ENV__
    const env = (typeof window !== "undefined" && window.__SIRKULA_ENV__) || {};
    const provider = (env.MAP_PROVIDER || "openstreetmap").toLowerCase();
    const apiKey = env.MAP_API_KEY || env.MAPBOX_TOKEN || env.MAPTILER_KEY || "";

    let tileUrl = "";
    let tileOptions = {
      maxZoom: 19,
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap</a> contributors · SIRKULA-AI PostGIS"
    };

    if (provider === "mapbox" && apiKey) {
      tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${apiKey}`;
      tileOptions.attribution = "&copy; Mapbox &copy; OpenStreetMap · SIRKULA-AI";
      tileOptions.tileSize = 256;
    } else if (provider === "maptiler" && apiKey) {
      tileUrl = `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${apiKey}`;
      tileOptions.attribution = "&copy; MapTiler &copy; OpenStreetMap · SIRKULA-AI";
    } else if (provider === "cartodb" && apiKey) {
      tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${apiKey}`;
      tileOptions.subdomains = "abcd";
    } else {
      // Default: OpenStreetMap Resmi (100% GRATIS, tanpa watermark, tanpa perlu API key)
      tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      tileOptions.subdomains = ["a", "b", "c"];
    }

    L.tileLayer(tileUrl, tileOptions).addTo(map);

    currentCirclesLayer = L.layerGroup().addTo(map);
    currentMarkersLayer = L.layerGroup().addTo(map);
    mapInstance = map;

    // Render batches & user marker
    updateMapData(batches, activeActor);

    // Invalidate size after layout rendering
    window.setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 150);

    return map;
  } catch (err) {
    console.error("Failed to initialize Leaflet map:", err);
    return null;
  }
}

export function updateMapData(batches = [], activeActor = null) {
  if (!mapInstance || !isLeafletAvailable()) return;

  const L = window.L;
  currentCirclesLayer.clearLayers();
  currentMarkersLayer.clearLayers();

  const bounds = [];

  // 1. Plot current actor location if available
  if (activeActor && activeActor.latitude && activeActor.longitude) {
    const userLat = Number(activeActor.latitude);
    const userLng = Number(activeActor.longitude);
    bounds.push([userLat, userLng]);

    const userIcon = L.divIcon({
      className: "user-location-marker",
      html: `
        <div style="position:relative; width:28px; height:28px; display:grid; place-items:center;">
          <div style="position:absolute; width:28px; height:28px; border-radius:50%; background:rgba(59,130,246,0.3); animation:pulse-user 2s infinite;"></div>
          <div style="position:relative; width:14px; height:14px; border-radius:50%; background:#2563EB; border:2.5px solid #FFFFFF; box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const userMarker = L.marker([userLat, userLng], { icon: userIcon });
    userMarker.bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:180px; padding:4px;">
        <span style="font-size:10px; font-weight:700; color:#2563eb; letter-spacing:0.04em;">LOKASI ANDA</span>
        <h4 style="margin:2px 0 4px; font-size:13px; color:#0f172a;">${escapeHtml(activeActor.businessName || activeActor.name)}</h4>
        <p style="margin:0; font-size:11px; color:#64748b;">${escapeHtml(activeActor.area || "Kota Bandung")}</p>
      </div>
    `);
    currentMarkersLayer.addLayer(userMarker);
  }

  // 2. Plot active batch markers with PostGIS Ripple Circles
  for (const b of batches) {
    let lat = b.obfuscatedLocation?.latitude || b.latitude;
    let lng = b.obfuscatedLocation?.longitude || b.longitude;

    if (lat == null || lng == null) {
      // Seed fallback coordinates based on donor Sabuga / Dago
      lat = -6.8863 + (Math.random() - 0.5) * 0.015;
      lng = 107.6080 + (Math.random() - 0.5) * 0.015;
    }

    lat = Number(lat);
    lng = Number(lng);
    bounds.push([lat, lng]);

    const state = b.state || "TIER_1_HUMAN_ACTIVE";
    const color = TIER_COLORS[state] || "#10B981";
    const radiusM = Number(b.current_ripple_radius_m || b.rippleRadiusM || 1500);

    // Draw PostGIS Ripple Circle (Obfuscation Area)
    const circle = L.circle([lat, lng], {
      radius: radiusM,
      color: color,
      fillColor: color,
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: "4, 6"
    });
    currentCirclesLayer.addLayer(circle);

    // Draw Pulsing Pin Marker
    const markerIcon = L.divIcon({
      className: "batch-radar-marker",
      html: `
        <div style="position:relative; width:34px; height:34px; display:grid; place-items:center; cursor:pointer;">
          <div style="position:absolute; width:34px; height:34px; border-radius:50%; background:${color}33; animation:pulse-radar 2s infinite ease-out;"></div>
          <div style="position:relative; width:16px; height:16px; border-radius:50%; background:${color}; border:2.5px solid #FFFFFF; box-shadow:0 0 8px ${color}88;"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([lat, lng], { icon: markerIcon });

    const safeWindowText = b.safeWindowMinutes
      ? `<div style="margin-top:4px; font-size:11px; font-weight:700; color:#0b7a6b;">⏱️ Sisa ${b.safeWindowMinutes}m (Q₁₀ Bio-Thermal)</div>`
      : "";

    const distanceText = b.distanceMeters != null
      ? `<div style="font-size:11px; color:#64748b; margin-top:2px;">📍 ${b.distanceMeters < 1000 ? Math.round(b.distanceMeters) + " m" : (b.distanceMeters / 1000).toFixed(1) + " km"} dari Anda</div>`
      : "";

    const popupHtml = `
      <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:210px; padding:4px;">
        <span style="font-size:10px; font-weight:700; color:${color}; letter-spacing:0.04em; text-transform:uppercase;">${escapeHtml(b.category || "BATCH MAKANAN")}</span>
        <h4 style="margin:2px 0 4px; font-size:14px; font-weight:700; color:#0f172a; line-height:1.25;">${escapeHtml(b.title || "Paket Makanan")}</h4>
        <p style="margin:0; font-size:12px; color:#475569;">${escapeHtml(b.donor || "Donor")} · <strong>${b.portions ? b.portions + " porsi" : b.weightKg + " kg"}</strong></p>
        ${distanceText}
        ${safeWindowText}
        <div style="margin-top:10px; pt:6px; border-top:1px solid #e2e8f0;">
          <a href="/batches/${encodeURIComponent(b.id)}" style="display:inline-block; width:100%; text-align:center; background:#0B7A6B; color:#ffffff; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; text-decoration:none;">Buka Detail / Klaim &rarr;</a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    currentMarkersLayer.addLayer(marker);
  }

  // Auto-fit bounds if we have points
  if (bounds.length > 0 && mapInstance) {
    try {
      mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } catch {
      // ignore bounds error
    }
  }
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[char]));
}
