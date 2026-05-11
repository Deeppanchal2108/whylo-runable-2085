import { Hono } from 'hono';
import { cors } from "hono/cors"
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { buildSite } from './generator';

// Ensure sites directory exists — works in both dev (cwd = packages/web) and prod
const SITES_DIR = path.resolve(process.cwd(), 'sites');
if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR, { recursive: true });
console.log('[whylo] sites dir:', SITES_DIR);

const app = new Hono()
  .basePath('api')
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true }))
  .get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }))
  .get('/health', (c) => c.json({ status: 'ok' }))
  .post('/scrape', async (c) => {
    let body: { url?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { url } = body;
    if (!url || typeof url !== 'string') {
      return c.json({ error: 'url is required' }, 400);
    }

    // Validate it looks like a Google Maps URL
    if (!url.includes('google') && !url.includes('maps.app.goo.gl') && !url.includes('goo.gl')) {
      return c.json({ error: 'Please provide a valid Google Maps URL' }, 400);
    }

    const scriptPath = path.resolve(process.cwd(), 'src/api/scraper.py');

    return new Promise((resolve) => {
      const proc = spawn('python3', [scriptPath, url], {
        timeout: 90000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      proc.on('close', (code: number) => {
        if (code !== 0) {
          console.error('Scraper stderr:', stderr);
          resolve(c.json({ error: 'Scraper failed', details: stderr.slice(0, 500) }, 500));
          return;
        }

        // Extract JSON from stdout (script prints progress lines then JSON)
        const jsonStart = stdout.lastIndexOf('{');
        if (jsonStart === -1) {
          resolve(c.json({ error: 'No JSON in scraper output', raw: stdout.slice(0, 300) }, 500));
          return;
        }

        // Find the JSON blob — it starts at the last { that opens the result
        // Actually script prints "RESULT_JSON:" prefix
        const marker = 'RESULT_JSON:';
        const markerIdx = stdout.indexOf(marker);
        let jsonStr = '';
        if (markerIdx !== -1) {
          jsonStr = stdout.slice(markerIdx + marker.length).trim();
        } else {
          // fallback: grab from last line that starts with {
          const lines = stdout.split('\n');
          const jsonLines = lines.filter(l => l.trim().startsWith('{'));
          jsonStr = jsonLines[jsonLines.length - 1] || '';
        }

        try {
          const data = JSON.parse(jsonStr);
          resolve(c.json({ success: true, data }));
        } catch (e) {
          resolve(c.json({ error: 'Failed to parse scraper JSON', raw: stdout.slice(0, 500) }, 500));
        }
      });

      proc.on('error', (err: Error) => {
        resolve(c.json({ error: err.message }, 500));
      });
    });
  });

const appWithGenerate = app.post('/generate', async (c) => {
    let body: { data?: any; forceTemplate?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { data, forceTemplate } = body;
    if (!data) return c.json({ error: 'data is required' }, 400);

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
    // No key = still works, generator falls back to smart template-based copy

    try {
      const site = await buildSite(data, apiKey, forceTemplate);
      return c.json(site);
    } catch (e: any) {
      console.error('buildSite error:', e);
      return c.json({ error: e.message || 'Generation failed' }, 500);
    }
  });

const appWithSave = appWithGenerate
  // Save site HTML and return a shareable slug
  .post('/save', async (c) => {
    let body: { html?: string; name?: string };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

    const { html, name } = body;
    if (!html) return c.json({ error: 'html is required' }, 400);

    // Build slug from business name
    const slug = (name || 'site')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) + '-' + Date.now().toString(36);

    const filePath = path.join(SITES_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');

    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    return c.json({ slug, url: `${baseUrl}/api/site/${slug}` });
  })
  // Serve a saved site
  .get('/site/:slug', (c) => {
    const { slug } = c.req.param();
    // Sanitize slug
    const safe = slug.replace(/[^a-z0-9-]/g, '');
    const filePath = path.join(SITES_DIR, `${safe}.html`);
    if (!fs.existsSync(filePath)) return c.text('Site not found', 404);
    const html = fs.readFileSync(filePath, 'utf-8');
    return c.html(html);
  });

export type AppType = typeof appWithSave;
export default appWithSave;
