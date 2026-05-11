# Whylo Task State

## DONE ✓
- [x] `/api/scrape` POST route in `index.ts` — spawns Python scraper subprocess
- [x] `scraper.py` — 2-step strategy: resolve URL → search Maps → click result → full panel
- [x] Frontend input wired to `/api/scrape`
- [x] Loading animation: spinner + cycling messages + loading dots in button
- [x] Results panel: business card, sentiment pills, photo grid, reviews list, CTA
- [x] CSS for all new components
- [x] Clean text: strips Google Maps icon unicode characters
- [x] Error state UI

## SCRAPER NOTES
- Short URLs (maps.app.goo.gl) → resolve to /maps/place/ URL → extract business name → do Maps search → click first result → gets full panel with tabs
- This works because search-then-click gets the full panel (not limited view)
- Reviews: up to ~30 per scroll batch, Google caps at ~10 without login for some businesses
- Photos: lh3.googleusercontent.com URLs, upgraded to w800-h600-k-no params
- Review text selector: span.wiI7pd | Stars: [role="img"] aria-label | Author: div.d4r55

## IN PROGRESS
- [ ] Claude AI analysis of reviews → generate site copy
- [ ] Deploy generated site to subdomain
- [ ] User auth, dashboard
- [ ] Apify for bulk reviews (production)

## ENV
- Dev server: port 4200 (nohup bun run dev --port 4200)
- Scraper: python3 packages/web/src/api/scraper.py <url>
- Storage: /home/user/gmaps_photos/ (test data)
- Test data: /home/user/gmaps_raw.json (Haldirams, 10 reviews)
