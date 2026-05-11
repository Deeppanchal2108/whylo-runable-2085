#!/usr/bin/env python3
"""
Whylo Google Maps scraper — v10
Fix: use /maps/search/ flow instead of /place/ direct URL
Google headless-strips place names from /place/ URLs → empty map.
Solution: search → click first result → scrape panel.
"""
import asyncio, json, re, sys, urllib.parse, urllib.request
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else ""

def log(msg): print(msg, file=sys.stderr, flush=True)

def clean(t):
    if not t: return None
    t = re.sub(r'[\ue000-\uf8ff]', '', t)
    return re.sub(r'\s+', ' ', t).strip() or None

def resolve_url(url):
    if "google.com/maps" in url:
        return url
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=10)
        final = res.geturl()
        log(f"→ Resolved: {final[:120]}")
        return final
    except Exception as e:
        log(f"→ Resolve failed ({e}), using original")
        return url

def extract_name_from_url(url):
    """Extract business name from /place/Name/ URL segment."""
    m = re.search(r'/maps/place/([^/@?&]+)', url)
    if m:
        name = urllib.parse.unquote_plus(m.group(1)).replace('+', ' ').strip()
        skip = {'results', 'search', '', 'maps', 'place', 'google maps'}
        if name and name.lower() not in skip:
            return name
    return None

def extract_query_from_url(url):
    """Extract search query from /maps/search/QUERY or q= param."""
    # /maps/search/QUERY
    m = re.search(r'/maps/search/([^/@?&]+)', url)
    if m:
        return urllib.parse.unquote_plus(m.group(1)).replace('+', ' ').strip()
    # ?q=QUERY
    m = re.search(r'[?&]q=([^&]+)', url)
    if m:
        return urllib.parse.unquote_plus(m.group(1)).replace('+', ' ').strip()
    return None

def is_real_photo(url: str) -> bool:
    """Filter out user profile avatars — only keep actual place photos."""
    if not url or len(url) < 60:
        return False
    # User profile avatars: /a/ path or /a-/ path
    if "/a/ACg8oc" in url or "/a/AF" in url:
        return False
    if "googleusercontent.com/a-/" in url:
        return False
    if "googleusercontent.com/a/" in url:
        return False
    return True

async def scroll_to_bottom(page, max_scrolls=40, check_selector='.jftiEf'):
    """Scroll the reviews panel until no new items load."""
    prev_count = -1
    stale = 0
    for i in range(max_scrolls):
        # Try every known scrollable container — scroll all of them
        await page.evaluate("""() => {
            const sels = [
                '.m6QErb.DxyBCb.kA9KIf',
                '.m6QErb.DxyBCb',
                '.m6QErb[aria-label]',
                '.m6QErb',
                'div[role="feed"]',
                'div[aria-label*="review"]',
                'div[aria-label*="Review"]',
                'div[tabindex="-1"]',
                'div[role="main"]',
            ];
            let scrolled = false;
            for (const sel of sels) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    if (el.scrollHeight > el.clientHeight + 50) {
                        el.scrollTop = el.scrollHeight;
                        scrolled = true;
                    }
                }
            }
            // Fallback: scroll the whole page
            if (!scrolled) window.scrollTo(0, document.body.scrollHeight);
        }""")
        await page.wait_for_timeout(1500)
        cur_count = await page.locator(check_selector).count()
        log(f"   Scroll {i+1}: {cur_count} items")
        if cur_count == prev_count:
            stale += 1
            if stale >= 4:
                log(f"   Stable at {cur_count}, stopping scroll")
                break
        else:
            stale = 0
        prev_count = cur_count
    return prev_count

async def navigate_to_business(page, query):
    """
    Use search flow to reliably open a business panel in headless Chrome.
    Direct /place/Name/ URLs don't work headlessly — Google strips the name.
    """
    search_url = f"https://www.google.com/maps/search/{urllib.parse.quote(query)}"
    log(f"→ Searching: {search_url}")
    await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(4000)

    # Check if we already landed on a single business panel (CID-based or direct)
    tabs_count = await page.locator('[role="tab"]').count()
    log(f"→ Tabs after search load: {tabs_count}")
    if tabs_count >= 2:
        log("→ Already on business panel")
        return True

    # Try clicking the first result card
    # Google Maps search results use .Nv2PK for result cards
    result_selectors = [
        '.Nv2PK',
        '[role="article"]',
        '.hfpxzc',
        'a[href*="/maps/place/"]',
        '.lI9IFe',
    ]
    clicked = False
    for sel in result_selectors:
        try:
            count = await page.locator(sel).count()
            log(f"   Selector {sel!r}: {count} results")
            if count > 0:
                await page.locator(sel).first.click(timeout=3000)
                await page.wait_for_timeout(4000)
                tabs_count = await page.locator('[role="tab"]').count()
                log(f"   Tabs after clicking first result: {tabs_count}")
                if tabs_count >= 2:
                    clicked = True
                    break
                # Even with 0 tabs, proceed — some places show info without tabs
                clicked = True
                break
        except Exception as e:
            log(f"   Click failed for {sel!r}: {e}")
            continue

    if not clicked:
        log("→ Could not click any result — taking screenshot for debug")
        try:
            await page.screenshot(path="/tmp/debug_search.png")
        except:
            pass
        return False

    tabs_count = await page.locator('[role="tab"]').count()
    log(f"→ Final tabs count: {tabs_count}")
    return True

async def scrape(raw_url):
    log(f"→ Input: {raw_url[:80]}")
    url = resolve_url(raw_url)

    # Determine search query from the URL
    query = extract_name_from_url(url) or extract_query_from_url(url)
    log(f"→ Query: {query!r}")

    if not query:
        # Last resort: use the raw URL stripped of params as a search term
        # e.g. user might paste a short URL we couldn't resolve
        return {"error": "Could not extract business name. Paste a direct Google Maps place URL."}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--disable-setuid-sandbox"]
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-US",
            viewport={"width": 1280, "height": 900}
        )
        page = await ctx.new_page()

        # Navigate via search flow
        ok = await navigate_to_business(page, query)
        if not ok:
            log("→ Navigation failed — check /tmp/debug_search.png")

        # Extract business info
        info = await page.evaluate("""() => {
            const h1s = Array.from(document.querySelectorAll('h1'))
                .map(h => h.innerText.trim())
                .filter(t => t && t !== 'Results' && t !== 'Google Maps');
            const name = h1s[h1s.length - 1] || null;

            let rating = null, totalReviews = null;
            const f7 = document.querySelector('div.F7nice');
            if (f7) {
                const txt = f7.innerText;
                const rm = txt.match(/([\d.]+)/);
                const rvm = txt.match(/\(([\d,]+)\)/);
                if (rm) rating = parseFloat(rm[1]);
                if (rvm) totalReviews = parseInt(rvm[1].replace(/,/g, ''));
            }

            let category = null;
            const catEl = document.querySelector('button[jsaction*="category"], .DkEaL, [class*="mgr77e"] button');
            if (catEl) category = catEl.innerText.trim();

            let address=null, phone=null, website=null, hours=null;
            document.querySelectorAll('[data-item-id], button[aria-label]').forEach(el => {
                const id = (el.getAttribute('data-item-id')||'').toLowerCase();
                const label = (el.getAttribute('aria-label')||'').toLowerCase();
                const text = el.innerText.trim().slice(0,300);
                if (!text) return;
                if ((id.includes('address')||label.includes('address'))&&!address) address=text;
                else if ((id.includes('phone')||label.includes('phone'))&&!phone) phone=text;
                else if ((id.includes('website')||label.includes('website'))&&!website) website=text;
                else if ((id.includes('openhours')||label.includes('hour'))&&!hours) hours=text;
            });
            return {name,rating,totalReviews,category,address,phone,website,hours};
        }""")

        data = {
            "name": clean(info.get("name")) or query,
            "rating": info.get("rating"),
            "total_reviews": info.get("totalReviews"),
            "category": clean(info.get("category")),
            "address": clean(info.get("address")),
            "phone": clean(info.get("phone")),
            "website": clean(info.get("website")),
            "hours": clean(info.get("hours")),
            "photos": [],
            "reviews": [],
            "review_count_scraped": 0,
        }
        log(f"   Name: {data['name']} | Rating: {data['rating']} | Reviews: {data['total_reviews']}")

        # ── Tab helpers ──────────────────────────────────────────────────────
        async def get_tabs():
            tabs = page.locator('[role="tab"]')
            cnt = await tabs.count()
            texts = []
            for i in range(cnt):
                try:
                    texts.append((await tabs.nth(i).inner_text()).strip().lower())
                except:
                    texts.append("")
            return tabs, texts

        tabs, tab_texts = await get_tabs()
        log(f"   Tabs: {tab_texts}")

        # ── Photos ───────────────────────────────────────────────────────────
        if "photos" in tab_texts:
            idx = tab_texts.index("photos")
            await tabs.nth(idx).click()
            await page.wait_for_timeout(3000)
            for _ in range(4):
                await page.evaluate("""() => {
                    const sels = ['.m6QErb.DxyBCb', '.m6QErb', 'div[role="main"]'];
                    for (const sel of sels) {
                        for (const el of document.querySelectorAll(sel)) {
                            if (el.scrollHeight > el.clientHeight + 100) {
                                el.scrollTop += 1500;
                                return;
                            }
                        }
                    }
                }""")
                await page.wait_for_timeout(1000)
        else:
            log("   No Photos tab found")

        raw_photos = await page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img[src*="googleusercontent"]'));
            return imgs.map(img => img.src || img.getAttribute('src') || '').filter(Boolean);
        }""")

        real_photos = []
        seen_photos = set()
        for ph in raw_photos:
            if not is_real_photo(ph):
                continue
            normalized = re.sub(r'=w\d+-h\d+[^"& ]*', '=w800-h600-k-no', ph)
            if normalized not in seen_photos:
                seen_photos.add(normalized)
                real_photos.append(normalized)

        data["photos"] = real_photos[:20]
        log(f"   Real photos: {len(real_photos)} (filtered from {len(raw_photos)} total)")

        # ── Reviews ──────────────────────────────────────────────────────────
        tabs, tab_texts = await get_tabs()
        if "reviews" in tab_texts:
            idx = tab_texts.index("reviews")
            await tabs.nth(idx).click()
            await page.wait_for_timeout(3000)
            log("   Clicked Reviews tab")
        else:
            log(f"   No Reviews tab found. Tabs: {tab_texts}")

        total_reviews = data.get("total_reviews") or 0
        # Cap at 8 scrolls max — we only need ~50 reviews for good testimonials
        max_scrolls = 8
        log(f"   Scrolling for up to ~50 reviews (max {max_scrolls} scrolls)...")

        # Detect which review card selector is active
        review_sel = '.jftiEf'
        for try_sel in ['.jftiEf[data-review-id]', '.jftiEf', '[data-review-id]', '.GHT2ce']:
            c = await page.locator(try_sel).count()
            if c > 0:
                review_sel = try_sel
                log(f"   Using review selector: {try_sel!r} ({c} found)")
                break

        await scroll_to_bottom(page, max_scrolls=max_scrolls, check_selector=review_sel)

        # Expand "See more"
        try:
            more_btns = page.locator('button.w8nwRe, button[aria-label*="See more"], button[aria-label*="more"]')
            mc = await more_btns.count()
            log(f"   Expanding {mc} 'See more' buttons")
            for i in range(min(mc, 200)):
                try:
                    await more_btns.nth(i).click(timeout=200)
                except:
                    pass
            if mc > 0:
                await page.wait_for_timeout(800)
        except Exception as e:
            log(f"   See more err: {e}")

        # Extract review cards
        reviews_raw = await page.evaluate("""() => {
            const out = [];
            const cards = document.querySelectorAll('.jftiEf[data-review-id]');
            (cards.length > 0 ? cards : document.querySelectorAll('[data-review-id]')).forEach(block => {
                const r = {};
                const aEl = block.querySelector('[class*="d4r55"], .WNxzHc, [class*="Vpc5Fe"]');
                r.author = aEl ? aEl.innerText.split('\\n')[0].replace(/\\s*[·•].*$/, '').trim() : null;
                const bEl = block.querySelector('[class*="RfnDt"]');
                r.badge = bEl ? bEl.innerText.trim() : null;
                const rEl = block.querySelector('[role="img"][aria-label]');
                if (rEl) {
                    const m = (rEl.getAttribute('aria-label')||'').match(/(\d)/);
                    r.rating = m ? parseInt(m[1]) : null;
                } else r.rating = null;
                const dEl = block.querySelector('[class*="rsqaWe"]');
                r.date = dEl ? dEl.innerText.trim() : null;
                const tEl = block.querySelector('[class*="wiI7pd"]');
                r.text = tEl ? tEl.innerText.replace(/\\s+/g,' ').trim() : null;
                const oEl = block.querySelector('[class*="CDe7pd"]');
                r.owner_reply = oEl ? oEl.innerText.replace(/\\s+/g,' ').trim().slice(0,600) : null;
                if (r.text || r.rating) {
                    r.sentiment = r.rating >= 4 ? 'positive' : r.rating === 3 ? 'neutral' : r.rating ? 'negative' : null;
                    out.push(r);
                }
            });
            return out;
        }""")

        # Deduplicate
        seen = set()
        deduped = []
        for r in reviews_raw:
            key = ((r.get("author") or ""), (r.get("text") or "")[:60], (r.get("date") or ""))
            if key not in seen:
                seen.add(key)
                for k in ("author","date","text","owner_reply","badge"):
                    r[k] = clean(r.get(k))
                deduped.append(r)

        data["reviews"] = deduped
        data["review_count_scraped"] = len(deduped)
        log(f"→ DONE — reviews: {len(deduped)}/{total_reviews}, photos: {len(data['photos'])}")

        await browser.close()
        return data

async def main():
    if not URL:
        print("RESULT_JSON:" + json.dumps({"error": "No URL provided"}))
        return
    try:
        result = await scrape(URL)
        print("RESULT_JSON:" + json.dumps(result, ensure_ascii=False))
    except Exception as e:
        import traceback
        log(traceback.format_exc())
        print("RESULT_JSON:" + json.dumps({"error": str(e)}))

asyncio.run(main())
