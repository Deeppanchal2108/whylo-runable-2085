import { Hono } from "hono";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import app from "./src/api/index";

const port = parseInt(process.env.PORT || "3000");
const distPath = join(import.meta.dir, "dist");

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = new Hono();

// API routes first
server.route("/", app);

// Static files + SPA fallback
server.get("*", (c) => {
  const url = new URL(c.req.url);
  let filePath = join(distPath, url.pathname);

  // If file exists, serve it
  if (existsSync(filePath) && !filePath.endsWith("/")) {
    const ext = extname(filePath);
    const mime = mimeTypes[ext] || "application/octet-stream";
    const content = readFileSync(filePath);
    return new Response(content, {
      headers: { "Content-Type": mime },
    });
  }

  // SPA fallback
  const html = readFileSync(join(distPath, "index.html"), "utf-8");
  return c.html(html);
});

Bun.serve({
  fetch: server.fetch,
  port,
});

console.log(`Whylo server running on port ${port}`);
