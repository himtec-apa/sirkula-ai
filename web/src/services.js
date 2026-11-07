const tokenChars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function analyzeFoodPhoto(fileName) {
  const name = String(fileName || "").toLowerCase();
  const sample = name.includes("roti") || name.includes("bread")
    ? { title: "Roti dan pastry", category: "Roti & pastry", portions: 20, weightKg: 3.4 }
    : { title: "Nasi kotak ayam", category: "Makanan siap santap", portions: 24, weightKg: 6.2 };
  return {
    ...sample,
    confidence: 0.82,
    source: "simulation",
    note: "Contoh respons simulasi. Foto tidak dianalisis oleh model AI dan hasil ini tidak menilai keamanan pangan."
  };
}

export function makeHandoverToken() {
  const values = new Uint32Array(6);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(values);
  else for (let i = 0; i < values.length; i += 1) values[i] = Math.floor(Math.random() * 100000);
  return "DEMO-" + Array.from(values, (value) => tokenChars[value % tokenChars.length]).join("");
}

export function validatePhoto(file) {
  if (!file) return "Pilih foto makanan.";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Gunakan foto JPG, PNG, atau WebP.";
  if (file.size > 5 * 1024 * 1024) return "Ukuran foto maksimal 5 MB.";
  return "";
}