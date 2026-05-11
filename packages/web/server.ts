import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import app from "./src/api/index";

const port = parseInt(process.env.PORT || "3000");

const server = new Hono();

// Mount API routes
server.route("/", app);

// Serve static files from dist/
server.use("*", serveStatic({ root: "./dist" }));

// SPA fallback
server.get("*", async (c) => {
  const html = await Bun.file("./dist/index.html").text();
  return c.html(html);
});

serve({ fetch: server.fetch, port }, () => {
  console.log(`Whylo server running on port ${port}`);
});
