const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 3000;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendFile(request, response, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-cache"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}

function loadEnv() {
  const envPath = path.resolve(__dirname, ".env");
  const envVars = {};
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          envVars[key] = val;
        }
      }
    } catch {
      // safe fallback on mount read error
    }
  }
  return envVars;
}

const host = process.env.HOST || "0.0.0.0";

http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  if (pathname === "/env.js") {
    const env = { ...loadEnv(), ...process.env };
    const publicEnv = {
      MAP_PROVIDER: env.MAP_PROVIDER || "cartodb",
      MAP_API_KEY: env.MAP_API_KEY || "",
      MAPBOX_TOKEN: env.MAPBOX_TOKEN || env.MAP_API_KEY || "",
      MAPTILER_KEY: env.MAPTILER_KEY || env.MAP_API_KEY || "",
      API_BASE_URL: env.API_BASE_URL || ""
    };
    const body = `window.__SIRKULA_ENV__ = ${JSON.stringify(publicEnv)};`;
    response.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache"
    });
    response.end(body);
    return;
  }

  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, requested);
  if (!filePath.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(request, response, filePath);
      return;
    }
    if (path.extname(pathname)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    sendFile(request, response, path.join(root, "index.html"));
  });
}).listen(port, host, () => {
  process.stdout.write("SIRKULA-AI demo: http://" + (host === "0.0.0.0" ? "127.0.0.1" : host) + ":" + port + "\n");
});