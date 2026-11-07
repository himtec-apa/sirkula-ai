import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInitialState, ROLES, BATCH_STATES } from "../src/data.js";

const syntaxFiles = [
  "server.cjs", "src/data.js", "src/services.js", "src/store.js",
  "src/router.js", "src/views.js", "src/main.js",
  "scripts/check.js", "scripts/smoke.mjs"
];
for (const file of syntaxFiles) {
  assert.ok(existsSync(file), "Required file missing: " + file);
  const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr || "Syntax error in " + file);
}

for (const asset of ["assets/food-rescue-scenes.png", "assets/tier2-farmer.png", "assets/favicon.svg", "index.html"]) {
  assert.ok(existsSync(asset), "Required SIRKULA-AI asset missing: " + asset);
}
assert.equal(Object.keys(ROLES).length, 6);
assert.deepEqual(BATCH_STATES, [
  "TIER_1_HUMAN_ACTIVE", "TIER_1_CLAIMED", "TIER_2_ANIMAL_ACTIVE",
  "TIER_2_CLAIMED", "TIER_3_COMPOST_ACTIVE", "COMPLETED", "CANCELLED_BY_DONOR"
]);
assert.equal(new Set(BATCH_STATES).size, BATCH_STATES.length);
const initial = createInitialState();
assert.ok(initial.batches.every((item) => BATCH_STATES.includes(item.state)));
assert.ok(initial.batches.every((item) => item.simulation === true));
assert.ok(initial.batches.every((item) => item.area && !item.exactPickupAddress));
assert.ok(!initial.batches.some((item) => item.state === "TIER_1_HUMAN_ACTIVE" && item.category === "Bahan organik"));
const schema = readFileSync("context/schema.sql", "utf8");
assert.match(schema, /animal_feed_suitable BOOLEAN NOT NULL DEFAULT FALSE/);
assert.doesNotMatch(schema, /'TIER_3_CLAIMED'/);

const appFiles = ["index.html", "src/data.js", "src/store.js", "src/router.js", "src/views.js", "src/main.js", "src/styles.css", "README.md"];
const forbidden = /cocopeat|sabut kelapa|sekam padi|serbuk kayu|ampas kopi|penghasil limbah|penerima limbah|jelajahi material|circular material marketplace/i;
for (const file of appFiles) {
  const content = readFileSync(file, "utf8");
  assert.doesNotMatch(content, forbidden, "Old material-marketplace content remains in " + file);
}
const viewSource = readFileSync("src/views.js", "utf8");
assert.match(viewSource, /Selamatkan pangan/);
assert.match(viewSource, /tidak.*keamanan pangan/i);
assert.match(viewSource, /SIMULASI/);
assert.match(readFileSync("index.html", "utf8"), /SIRKULA-AI/);

globalThis.localStorage = {
  value: null,
  getItem() { return this.value; },
  setItem(_key, value) { this.value = value; }
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent { constructor(type) { this.type = type; } };

const store = await import("../src/store.js?check");
assert.equal(store.setSession("actor-hub", "SIMULATOR_ADMIN"), false);
assert.equal(store.setSession("actor-hub", "TIER_1_HUB"), true);
assert.equal(store.claimBatch("batch-001"), true);
assert.equal(store.getState().batches.find((item) => item.id === "batch-001").state, "TIER_1_CLAIMED");
assert.equal(store.claimBatch("batch-001"), false);
const token = store.getState().batches.find((item) => item.id === "batch-001").claim.token;
assert.equal(store.setSession("actor-donor", "DONOR"), true);
assert.equal(store.confirmHandover("batch-001", "wrong"), false);
assert.equal(store.confirmHandover("batch-001", token), true);
const finished = store.getState().batches.find((item) => item.id === "batch-001");
assert.equal(finished.state, "COMPLETED");
assert.equal(finished.completedTier, "TIER_1_HUMAN");

const batch = store.createBatch({
  title: "Nasi demo baru", category: "Makanan siap santap", portions: 12,
  weightKg: 2.5, photo: "data:image/webp;base64,dGVzdA==", area: "Bandung",
  preparedAt: new Date(Date.now() - 60000).toISOString(), exposedMinutes: 0,
  storageCondition: "Tertutup, suhu ruang", allergenNotes: "Telur",
  claimDeadline: new Date(Date.now() + 3600000).toISOString(), donorReviewed: true
});
assert.ok(batch);
assert.equal(batch.state, "TIER_1_HUMAN_ACTIVE");
assert.equal(store.getState().auditLog[0].previousState, null);

assert.equal(store.setSession("actor-admin", "SIMULATOR_ADMIN"), true);
assert.equal(store.simulateTransition(batch.id, "TIER_2_ANIMAL_ACTIVE"), false);
assert.equal(store.setTierReview(batch.id, "TIER_2", true), true);
assert.equal(store.simulateTransition(batch.id, "TIER_2_ANIMAL_ACTIVE"), true);
const transitionLog = store.getState().auditLog.find((row) => row.batchId === batch.id && row.newState === "TIER_2_ANIMAL_ACTIVE");
assert.equal(transitionLog.previousState, "TIER_1_HUMAN_ACTIVE");
assert.equal(store.updateSimulationTemperature(batch.id, 34), true);
assert.equal(store.getState().batches.find((item) => item.id === batch.id).state, "TIER_2_ANIMAL_ACTIVE");
assert.equal(store.setSession("actor-farmer", "TIER_2_FARMER"), true);
assert.equal(store.claimBatch(batch.id), true);
const farmToken = store.getState().batches.find((item) => item.id === batch.id).claim.token;
assert.equal(store.setSession("actor-donor", "DONOR"), true);
assert.equal(store.confirmHandover(batch.id, farmToken), true);
assert.equal(store.getState().batches.find((item) => item.id === batch.id).completedTier, "TIER_2_ANIMAL");

const clockBatch = store.createBatch({
  title: "Batch waktu simulasi", category: "Makanan siap santap", portions: 8,
  weightKg: 1.8, photo: "data:image/webp;base64,dGVzdA==", area: "Bandung",
  preparedAt: new Date(Date.now() - 60000).toISOString(), exposedMinutes: 0,
  storageCondition: "Tertutup, suhu ruang", claimDeadline: new Date(Date.now() + 1800000).toISOString(), donorReviewed: true
});
assert.ok(clockBatch);
assert.equal(store.setSession("actor-admin", "SIMULATOR_ADMIN"), true);
assert.equal(store.advanceSimulationClock(clockBatch.id, 60), true);
assert.equal(store.getState().batches.find((item) => item.id === clockBatch.id).simulatedElapsedMinutes, 60);
assert.equal(store.setSession("actor-hub", "TIER_1_HUB"), true);
assert.equal(store.claimBatch(clockBatch.id), false);

assert.equal(store.setSession("actor-donor", "DONOR"), true);
const compostBatch = store.createBatch({
  title: "Batch kompos demo", category: "Makanan siap santap", portions: 10,
  weightKg: 2.1, photo: "data:image/webp;base64,dGVzdA==", area: "Bandung",
  preparedAt: new Date(Date.now() - 60000).toISOString(), exposedMinutes: 0,
  storageCondition: "Tertutup, suhu ruang", claimDeadline: new Date(Date.now() + 14400000).toISOString(), donorReviewed: true
});
assert.ok(compostBatch);
assert.equal(store.setSession("actor-admin", "SIMULATOR_ADMIN"), true);
assert.equal(store.setTierReview(compostBatch.id, "TIER_2", true), true);
assert.equal(store.simulateTransition(compostBatch.id, "TIER_2_ANIMAL_ACTIVE"), true);
assert.equal(store.setTierReview(compostBatch.id, "TIER_3", true), true);
assert.equal(store.simulateTransition(compostBatch.id, "TIER_3_COMPOST_ACTIVE"), true);
assert.equal(store.setSession("actor-compost", "TIER_3_COMPOST"), true);
assert.equal(store.claimBatch(compostBatch.id), true);
assert.equal(store.getState().batches.find((item) => item.id === compostBatch.id).state, "TIER_3_COMPOST_ACTIVE");
assert.equal(store.claimBatch(compostBatch.id), false);
const compostToken = store.getState().batches.find((item) => item.id === compostBatch.id).claim.token;
assert.equal(store.setSession("actor-donor", "DONOR"), true);
assert.equal(store.confirmHandover(compostBatch.id, compostToken), true);
assert.equal(store.getState().batches.find((item) => item.id === compostBatch.id).completedTier, "TIER_3_COMPOST");

store.logoutDemo();
assert.equal(store.getState().activeRole, null);
assert.ok(!store.getState().actors.some((actor) => Object.hasOwn(actor, "password")));
process.stdout.write("Syntax, product guardrails, role access, batch lifecycle, review gate, and audit checks passed.\n");
