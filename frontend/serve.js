import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, "dist");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4173;

// Validate that production build exists
if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  console.error("=======================================================");
  console.error("Error: frontend/dist/index.html does not exist!");
  console.error("Please compile the production build first by running:");
  console.error("  npm run build");
  console.error("=======================================================");
  process.exit(1);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0].split("#")[0];
  if (urlPath === "/") urlPath = "/index.html";

  try {
    urlPath = decodeURIComponent(urlPath);
  } catch {}

  let fullPath = path.resolve(path.join(DIST_DIR, urlPath));

  // Security: prevent directory traversal
  if (!fullPath.startsWith(DIST_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();

  // SPA fallback: if route has no file extension and file does not exist, serve dist/index.html
  if (!fs.existsSync(fullPath) || (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory())) {
    if (!ext) {
      fullPath = path.join(DIST_DIR, "index.html");
    }
  }

  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const headers = {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    };

    if (urlPath.startsWith("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    } else {
      headers["Cache-Control"] = "no-cache";
    }

    res.writeHead(200, headers);
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[OfflineConnect Web] Production server running at: http://localhost:${PORT}/`);
  console.log(`[OfflineConnect Web] Serving production build from: ${DIST_DIR}`);
});
