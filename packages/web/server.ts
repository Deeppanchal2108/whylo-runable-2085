import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFileSync } from "fs";
import { join } from "path";
import app from "./src/api/index";

const port = parseInt(process.env.PORT || "3000");
const distPath = join(import.meta.dir, "dist");

const server = new Hono();

// Mount API routes
server.route("/", app);

// Serve static files from dist/
server.use("*", serveStatic({ root: distPath }));

// SPA fallback
server.get("*", (c) => {
  try {
    const html = readFileSync(join(distPath, "index.html"), "utf-8");
    return c.html(html);
  } catch {
    return c.text("Not found", 404);
  }
});

serve({ fetch: server.fetch, port }, () => {
  console.log(`Whylo server running on port ${port}`);
});
