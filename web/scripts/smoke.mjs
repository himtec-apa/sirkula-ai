import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

const port = await freePort();
const child = spawn(process.execPath, ["server.cjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore"
});
const base = "http://127.0.0.1:" + port;
const paths = [
  "/", "/login", "/register", "/select-role", "/dashboard",
  "/dashboard/food-batches", "/dashboard/analytics", "/legal-vault",
  "/simulation", "/profile", "/missions", "/batches/new",
  "/batches/batch-001", "/src/main.js", "/src/styles.css",
  "/assets/favicon.svg", "/assets/food-rescue-scenes.png", "/assets/tier2-farmer.png"
];

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Demo server exited early.");
    try {
      const response = await fetch(base + "/");
      ready = response.ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  assert.ok(ready, "Demo server did not start.");

  for (const pathname of paths) {
    const response = await fetch(base + pathname);
    assert.equal(response.status, 200, pathname + " should return 200");
    if (pathname.endsWith(".png")) {
      assert.ok(response.headers.get("content-type").includes("image/png"));
    } else if (pathname.endsWith(".svg")) {
      assert.ok(response.headers.get("content-type").includes("image/svg+xml"));
    } else if (pathname.startsWith("/src/")) {
      assert.match(response.headers.get("content-type"), /javascript|css/);
    } else {
      assert.ok(response.headers.get("content-type").includes("text/html"));
      assert.match(await response.text(), /SIRKULA-AI/);
      continue;
    }
    await response.arrayBuffer();
  }
  process.stdout.write("Smoke routes and static assets passed: " + paths.length + " requests.\n");
} finally {
  child.kill();
}