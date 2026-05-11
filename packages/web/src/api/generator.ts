/**
 * Whylo AI Site Generator — v2
 *
 * AI generates:
 *   1. Template choice (luxury / minimal / playful / corporate)
 *   2. Full brand palette (primary, secondary, bg, text, accent, gradients)
 *   3. Font pairing (heading + body from Google Fonts)
 *   4. All copy (hero, about, features, testimonials, CTA, meta)
 *
 * Then injects everything into the static HTML template as CSS var overrides.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

const TEMPLATES_DIR = path.resolve(new URL(".", import.meta.url).pathname, "templates");

// ── Types ──────────────────────────────────────────────────────────────────
export interface ScrapeData {
  name: string | null;
  category: string | null;
  rating: number | null;
  total_reviews: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  photos: string[];
  reviews: Array<{
    author: string | null;
    text: string | null;
    rating: number | null;
    date: string | null;
    sentiment: string | null;
  }>;
}

export interface BrandPalette {
  primary: string;        // main CTA / accent color
  primary_text: string;   // text ON primary (e.g. #fff or #000)
  secondary: string;      // secondary accent
  bg: string;             // page background
  bg2: string;            // card / section background
  bg3: string;            // subtle third bg
  text: string;           // main body text
  text_muted: string;     // muted / subtext
  border: string;         // border / divider color
  gradient: string;       // hero gradient overlay CSS value
  font_heading: string;   // Google Fonts heading family name
  font_body: string;      // Google Fonts body family name
  font_heading_url: string; // Google Fonts URL for heading
  font_body_url: string;    // Google Fonts URL for body
  palette_name: string;   // e.g. "Warm Terracotta" – shown in editor
}

export interface SiteContent {
  // template
  template: "luxury" | "minimal" | "playful" | "corporate";
  template_reason: string;
  // brand
  brand: BrandPalette;
  // copy
  hero_title: string;
  hero_description: string;
  about_title: string;
  about_body: string;
  features_title: string;
  feature_1_title: string;
  feature_1_desc: string;
  feature_2_title: string;
  feature_2_desc: string;
  feature_3_title: string;
  feature_3_desc: string;
  testimonials_title: string;
  cta_heading: string;
  cta_subheading: string;
  cta_primary: string;
  meta_description: string;
  feature_count: string;
  feature_count_label: string;
}

export interface GeneratedSite {
  template: SiteContent["template"];
  html: string;
  css: string;
  js: string;
  content: SiteContent;
}

// ── Template selector rules (fallback) ────────────────────────────────────
const TEMPLATE_RULES: Array<{ keywords: string[]; template: SiteContent["template"] }> = [
  { keywords: ["salon", "spa", "beauty", "aesthetic", "luxury", "boutique", "hotel", "resort", "jewel", "gold", "premium", "fine dining", "gourmet", "high-end"], template: "luxury" },
  { keywords: ["clinic", "doctor", "dental", "dentist", "medical", "hospital", "therapy", "physio", "yoga", "wellness", "health", "pharmacy", "nutrition", "diet"], template: "minimal" },
  { keywords: ["cafe", "coffee", "bakery", "dessert", "ice cream", "bubble", "sweet", "boba", "fast food", "snack", "fun", "colorful", "kids", "toy", "play"], template: "playful" },
  { keywords: ["plumber", "electrician", "lawyer", "accountant", "real estate", "insurance", "contractor", "repair", "service", "business", "office", "consulting"], template: "corporate" },
];

function ruleBasedTemplate(category: string | null, name: string | null): SiteContent["template"] {
  const text = `${category || ""} ${name || ""}`.toLowerCase();
  for (const rule of TEMPLATE_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.template;
  }
  return "corporate";
}

// ── Star HTML ──────────────────────────────────────────────────────────────
function starsHtml(rating: number | null): string {
  if (!rating) return "";
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star">${i < Math.round(rating) ? "★" : "☆"}</span>`
  ).join("");
}

// ── AI generation ──────────────────────────────────────────────────────────
export async function generateSiteContent(data: ScrapeData, apiKey: string, forceTemplate?: string): Promise<SiteContent> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const reviewSample = data.reviews
    .filter(r => r.text && r.text.length > 20)
    .slice(0, 12)
    .map(r => `- "${r.text}" (${r.sentiment}, ${r.rating}★)`)
    .join("\n");

  const prompt = `You are a top-tier brand designer AND copywriter. Given a local business's data and reviews, you will:

1. Choose the best website template style
2. Design a UNIQUE, on-brand color palette and font pairing
3. Write compelling website copy that uses the customer's exact language

Business:
- Name: ${data.name}
- Category: ${data.category}
- Rating: ${data.rating}/5 (${data.total_reviews} reviews)
- Address: ${data.address || "N/A"}
- Phone: ${data.phone || "N/A"}
- Hours: ${data.hours || "N/A"}

Customer reviews (sample):
${reviewSample || "No text reviews available"}

---

TEMPLATE GUIDE:
- luxury: salons, spas, fine dining, hotels, jewelry, premium brands → dark bg, gold/jewel tones, serif fonts
- minimal: clinics, doctors, wellness, yoga, therapy → clean white/cream, sage/teal accents, modern sans
- playful: cafes, bakeries, dessert, bubble tea, kids → warm/vibrant, fun fonts, bold pops of color  
- corporate: plumbers, lawyers, contractors, repair, general services → professional navy/blue, trustworthy

COLOR PALETTE RULES:
- Make it UNIQUE to this specific business — don't use generic defaults
- Think about the emotional vibe: warmth, trust, energy, calm, luxury, fun
- primary: the main brand color (used for CTAs, key accents) — must be visually distinct and memorable
- secondary: complementary accent — can be used for highlights, hover states
- bg / bg2 / bg3: page backgrounds — create depth and layering
- text / text_muted: readable contrast against bg
- gradient: CSS value for hero overlay, e.g. "linear-gradient(135deg, rgba(10,5,0,.92) 0%, rgba(30,10,5,.5) 100%)"
- border: subtle divider/border

FONT PAIRING RULES:
- heading font: pick ONE distinctive Google Font that suits the brand vibe
- body font: pick ONE clean, readable Google Font
- Provide the exact Google Fonts URL for each
- Examples of good heading fonts: Playfair Display, Cormorant Garamond, Fraunces, DM Serif Display, Syne, Space Grotesk, Plus Jakarta Sans, Unbounded, Abril Fatface
- Examples of good body fonts: Inter, DM Sans, Nunito, Outfit, Lato, Source Sans 3, IBM Plex Sans, Manrope

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "template": "luxury|minimal|playful|corporate",
  "template_reason": "one sentence why",

  "brand": {
    "primary": "#hex",
    "primary_text": "#hex",
    "secondary": "#hex",
    "bg": "#hex",
    "bg2": "#hex",
    "bg3": "#hex",
    "text": "#hex",
    "text_muted": "#hex",
    "border": "#hex or rgba(...)",
    "gradient": "linear-gradient(...) or radial-gradient(...)",
    "font_heading": "Font Name",
    "font_body": "Font Name",
    "font_heading_url": "https://fonts.googleapis.com/css2?family=...",
    "font_body_url": "https://fonts.googleapis.com/css2?family=...",
    "palette_name": "Descriptive name like 'Warm Terracotta' or 'Deep Indigo'"
  },

  "hero_title": "Short punchy headline 8-12 words using customer language",
  "hero_description": "2 emotional sentences 30-40 words",
  "about_title": "About section headline 6-10 words",
  "about_body": "2-3 paragraphs 60-80 words about the business",
  "features_title": "Why choose us headline",
  "feature_1_title": "First differentiator 4-6 words",
  "feature_1_desc": "One sentence 15-20 words",
  "feature_2_title": "Second differentiator",
  "feature_2_desc": "One sentence",
  "feature_3_title": "Third differentiator",
  "feature_3_desc": "One sentence",
  "testimonials_title": "Testimonials headline 5-8 words",
  "cta_heading": "Strong CTA headline 6-10 words",
  "cta_subheading": "Supporting sentence 10-15 words",
  "cta_primary": "Button text 2-4 words",
  "meta_description": "SEO meta 150-160 chars",
  "feature_count": "e.g. '5+' or '200+' or '12'",
  "feature_count_label": "e.g. 'Years experience' or 'Happy clients'"
}`;

  let text = "";
  try {
    const result = await model.generateContent(prompt);
    text = result.response.text();
  } catch (e: any) {
    console.error("Gemini API error:", e.message);
    return fallbackContent(data, forceTemplate);
  }

  try {
    const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/```\s*$/m, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    // Force template if specified
    if (forceTemplate) parsed.template = forceTemplate;
    // Ensure brand exists (safety)
    if (!parsed.brand) parsed.brand = fallbackPalette(parsed.template || "corporate");
    return parsed as SiteContent;
  } catch (err) {
    console.error("Failed to parse Gemini response:", text.slice(0, 300));
    return fallbackContent(data, forceTemplate);
  }
}

// ── Fallback palette per template ─────────────────────────────────────────
function fallbackPalette(template: string): BrandPalette {
  const palettes: Record<string, BrandPalette> = {
    luxury: {
      primary: "#c9a84c", primary_text: "#0a0906",
      secondary: "#e8c97a", bg: "#0a0906", bg2: "#111009", bg3: "#1a1810",
      text: "#e8dcc8", text_muted: "#8a7d65", border: "rgba(201,168,76,0.2)",
      gradient: "linear-gradient(135deg, rgba(10,9,6,.92) 0%, rgba(10,9,6,.6) 100%)",
      font_heading: "Cormorant Garamond", font_body: "Montserrat",
      font_heading_url: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap",
      font_body_url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap",
      palette_name: "Midnight Gold",
    },
    minimal: {
      primary: "#3d6b5a", primary_text: "#ffffff",
      secondary: "#7ba898", bg: "#ffffff", bg2: "#f8f8f7", bg3: "#f0efec",
      text: "#1a1a1a", text_muted: "#6b6b6b", border: "#e5e5e3",
      gradient: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(248,248,247,0.5) 100%)",
      font_heading: "Playfair Display", font_body: "Inter",
      font_heading_url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap",
      font_body_url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap",
      palette_name: "Sage & Cream",
    },
    playful: {
      primary: "#ff6b2b", primary_text: "#ffffff",
      secondary: "#1dba72", bg: "#fffbf5", bg2: "#fff7ef", bg3: "#fff0e8",
      text: "#1a1107", text_muted: "#7a6548", border: "#ede8df",
      gradient: "linear-gradient(135deg, rgba(255,107,43,.85) 0%, rgba(29,186,114,.7) 100%)",
      font_heading: "Fraunces", font_body: "Plus Jakarta Sans",
      font_heading_url: "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700;900&display=swap",
      font_body_url: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      palette_name: "Citrus & Mint",
    },
    corporate: {
      primary: "#1a56db", primary_text: "#ffffff",
      secondary: "#0f2240", bg: "#f8f9fc", bg2: "#ffffff", bg3: "#eff6ff",
      text: "#111827", text_muted: "#6b7280", border: "#e5e7eb",
      gradient: "linear-gradient(135deg, rgba(15,34,64,.94) 0%, rgba(26,86,219,.7) 100%)",
      font_heading: "IBM Plex Serif", font_body: "IBM Plex Sans",
      font_heading_url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500&display=swap",
      font_body_url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&display=swap",
      palette_name: "Corporate Navy",
    },
  };
  return palettes[template] || palettes.corporate;
}

function fallbackContent(data: ScrapeData, forceTemplate?: string): SiteContent {
  const tmpl = (forceTemplate as SiteContent["template"]) || ruleBasedTemplate(data.category, data.name);
  const name = data.name || "Our Business";
  const cat = data.category || "service";
  const city = data.address?.split(",")[1]?.trim() || data.address?.split(",")[0]?.trim() || "your area";
  const rating = data.rating || 5;
  const totalReviews = data.total_reviews || 100;

  // Pull real phrases from positive reviews
  const positiveReviews = data.reviews.filter(r => r.sentiment === "positive" && r.text && r.text.length > 30);
  const longPositive = positiveReviews.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));

  // Extract a good quote snippet (first sentence of best review)
  const bestSnippet = longPositive[0]?.text?.split(/[.!?]/)[0]?.trim() || "";
  const secondSnippet = longPositive[1]?.text?.split(/[.!?]/)[0]?.trim() || "";

  // Template-specific copy
  const copyMap: Record<string, { heroTitle: string; heroDes: string; aboutTitle: string; aboutBody: string; f1t: string; f1d: string; f2t: string; f2d: string; f3t: string; f3d: string; cta: string }> = {
    luxury: {
      heroTitle: `${name} — Crafted for those who expect the finest`,
      heroDes: `${bestSnippet ? `"${bestSnippet}." ` : ""}Experience the difference that ${totalReviews}+ discerning customers have discovered. Rated ${rating} stars.`,
      aboutTitle: `The artistry behind ${name}`,
      aboutBody: `At ${name}, we believe every visit should be an experience worth remembering. Nestled in ${city}, we've earned our ${rating}-star reputation through unwavering commitment to craft and care.\n\n${secondSnippet ? `"${secondSnippet}" — just one of ${totalReviews}+ heartfelt reviews that inspire us every day.` : `With ${totalReviews}+ verified Google reviews, our customers' voices speak for us.`}`,
      f1t: "Uncompromising quality",
      f1d: `Every detail is considered — because at ${name}, mediocrity simply isn't an option.`,
      f2t: `${rating}-star rated`,
      f2d: `${totalReviews}+ verified reviews from customers who chose the best.`,
      f3t: "A personal touch",
      f3d: "We treat every customer as a guest, not a transaction.",
      cta: "Book your visit",
    },
    minimal: {
      heroTitle: `${name} — ${cat} you can trust in ${city}`,
      heroDes: `${bestSnippet ? `"${bestSnippet}." ` : ""}Backed by ${totalReviews}+ patient reviews and a ${rating}-star Google rating.`,
      aboutTitle: `Your trusted ${cat} in ${city}`,
      aboutBody: `${name} is built on the belief that every person deserves clear, compassionate care. Based in ${city}, we've guided ${totalReviews}+ clients with a ${rating}-star commitment to your wellbeing.\n\n${secondSnippet ? `As one client put it: "${secondSnippet}."` : "We put your health and peace of mind first, always."}`,
      f1t: "Evidence-based approach",
      f1d: "Our methods are grounded in the latest research and genuine care.",
      f2t: "Transparent & honest",
      f2d: "No jargon, no surprises — just clear guidance you can rely on.",
      f3t: `${totalReviews}+ happy clients`,
      f3d: `Rated ${rating} stars across hundreds of verified Google reviews.`,
      cta: "Book a consultation",
    },
    playful: {
      heroTitle: `${name} — ${city}'s favourite spot for ${cat}!`,
      heroDes: `${bestSnippet ? `"${bestSnippet}" ` : ""}Over ${totalReviews} happy customers can't be wrong. Come see why we're rated ${rating} stars!`,
      aboutTitle: `The sweet story of ${name}`,
      aboutBody: `We started ${name} with one simple dream: to bring joy to ${city}, one visit at a time. Today, ${totalReviews}+ happy customers and a glowing ${rating}-star rating later — that dream is very much alive!\n\n${secondSnippet ? `"${secondSnippet}" — we love hearing that from you!` : "Come in, treat yourself, and become part of our growing family."}`,
      f1t: "Made with love",
      f1d: `Every ${cat} at ${name} is crafted with real care and attention.`,
      f2t: "Always fresh",
      f2d: "Quality ingredients, zero shortcuts — taste the difference.",
      f3t: `${totalReviews}+ fans`,
      f3d: `Rated ${rating} stars — our community keeps coming back!`,
      cta: "Visit us today",
    },
    corporate: {
      heroTitle: `${name} — Reliable ${cat} in ${city}`,
      heroDes: `${bestSnippet ? `"${bestSnippet}." ` : ""}Trusted by ${totalReviews}+ customers with a ${rating}-star Google rating. Licensed, insured, and ready to help.`,
      aboutTitle: `Why ${city} trusts ${name}`,
      aboutBody: `${name} has been serving ${city} with professional ${cat} that gets the job done right. With ${totalReviews}+ verified reviews and a ${rating}-star rating, our track record speaks for itself.\n\n${secondSnippet ? `"${secondSnippet}." — that's what we aim for every time.` : "We show up on time, do the work right, and stand behind everything we do."}`,
      f1t: "Licensed & insured",
      f1d: "Fully certified professionals you can trust with your home or business.",
      f2t: "On-time, every time",
      f2d: "We respect your schedule and get the job done right the first time.",
      f3t: `${totalReviews}+ satisfied customers`,
      f3d: `A ${rating}-star reputation built on consistent, reliable service.`,
      cta: "Get a free quote",
    },
  };

  const copy = copyMap[tmpl] || copyMap.corporate;

  return {
    template: tmpl,
    template_reason: "Auto-selected based on business category",
    brand: fallbackPalette(tmpl),
    hero_title: copy.heroTitle,
    hero_description: copy.heroDes,
    about_title: copy.aboutTitle,
    about_body: copy.aboutBody,
    features_title: `Why customers choose ${name}`,
    feature_1_title: copy.f1t,
    feature_1_desc: copy.f1d,
    feature_2_title: copy.f2t,
    feature_2_desc: copy.f2d,
    feature_3_title: copy.f3t,
    feature_3_desc: copy.f3d,
    testimonials_title: "What our customers are saying",
    cta_heading: `Ready to experience ${name}?`,
    cta_subheading: `Join ${totalReviews}+ happy customers in ${city}.`,
    cta_primary: copy.cta,
    meta_description: `${name} — ${cat} in ${city}. Rated ${rating} stars by ${totalReviews}+ verified Google reviews. ${bestSnippet ? bestSnippet.slice(0, 80) + "." : ""}`.slice(0, 160),
    feature_count: `${totalReviews}+`,
    feature_count_label: "Happy customers",
  };
}

// ── Build brand CSS override ───────────────────────────────────────────────
function buildBrandCSS(brand: BrandPalette, template: string): string {
  // Map AI brand palette to the CSS variables each template uses
  const varMaps: Record<string, Record<string, string>> = {
    luxury: {
      "--bg": brand.bg,
      "--bg2": brand.bg2,
      "--bg3": brand.bg3,
      "--gold": brand.primary,
      "--gold2": brand.secondary,
      "--cream": brand.text,
      "--text": brand.text,
      "--muted": brand.text_muted,
      "--border": brand.border,
    },
    minimal: {
      "--bg": brand.bg,
      "--bg2": brand.bg2,
      "--bg3": brand.bg3,
      "--accent": brand.primary,
      "--accent2": brand.secondary,
      "--text": brand.text,
      "--muted": brand.text_muted,
      "--border": brand.border,
    },
    playful: {
      "--bg": brand.bg,
      "--bg2": brand.bg2,
      "--bg3": brand.bg3,
      "--primary": brand.primary,
      "--primary2": brand.secondary,
      "--secondary": brand.bg3,
      "--text": brand.text,
      "--muted": brand.text_muted,
      "--border": brand.border,
    },
    corporate: {
      "--bg": brand.bg,
      "--bg2": brand.bg2,
      "--bg3": brand.bg3,
      "--navy": brand.secondary,
      "--navy2": brand.bg2,
      "--blue": brand.primary,
      "--blue2": brand.secondary,
      "--text": brand.text,
      "--muted": brand.text_muted,
      "--border": brand.border,
    },
  };

  const vars = varMaps[template] || varMaps.corporate;
  const cssVars = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n");

  // Font imports + overrides
  const fontImports = [
    brand.font_heading_url !== brand.font_body_url
      ? `@import url('${brand.font_heading_url}');\n@import url('${brand.font_body_url}');`
      : `@import url('${brand.font_heading_url}');`,
  ].join("\n");

  // Template-specific font variable names
  const fontVarMap: Record<string, { heading: string; body: string }> = {
    luxury: { heading: "--ff-serif", body: "--ff-sans" },
    minimal: { heading: "--ff-serif", body: "--ff" },
    playful: { heading: "--ff-heading", body: "--ff-body" },
    corporate: { heading: "--ff-heading", body: "--ff-body" },
  };
  const fontVars = fontVarMap[template] || fontVarMap.corporate;

  return `${fontImports}

:root {
${cssVars}
  ${fontVars.heading}: '${brand.font_heading}', Georgia, serif;
  ${fontVars.body}: '${brand.font_body}', system-ui, sans-serif;
}

/* Hero gradient override */
.hero-overlay {
  background: ${brand.gradient} !important;
}

/* Button color override */
.btn-primary {
  background: ${brand.primary} !important;
  color: ${brand.primary_text} !important;
}
.btn-primary:hover {
  filter: brightness(1.1);
}`;
}

// ── Template rendering ─────────────────────────────────────────────────────
function pickBestTestimonials(data: ScrapeData, count = 3) {
  return data.reviews
    .filter(r => r.text && r.text.length > 20 && r.rating && r.rating >= 4)
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))
    .slice(0, count)
    .map(r => ({
      author: r.author || "Anonymous",
      quote: r.text!.slice(0, 280),
      text: r.text!.slice(0, 280),
      company: "Verified Customer",
      date: r.date || "",
      rating: r.rating || 5,
      initial: (r.author || "A")[0].toUpperCase(),
    }));
}

function renderTemplate(templateStr: string, vars: Record<string, any>): string {
  let result = templateStr;

  // {{#if key}}...{{/if}}
  for (let pass = 0; pass < 5; pass++) {
    const prev = result;
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) =>
      vars[key] ? inner : ""
    );
    if (result === prev) break;
  }

  // Generic {{#each arrayKey}}...{{/each}} handler
  result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrKey, inner) => {
    const items: any[] = vars[arrKey] || [];
    return items.map((item, idx) => {
      // Handle primitive arrays (e.g. gallery_images with {{this}})
      if (typeof item !== "object" || item === null) {
        return inner.replace(/\{\{this\}\}/g, item).replace(/\{\{@index\d*\}\}/g, String(idx));
      }
      let block = inner;
      const isFirst = idx === 0;
      const isLast = idx === items.length - 1;

      // {{#if @first}}...{{/if}} and {{#unless @first}}...{{/unless}}
      block = block.replace(/\{\{#if @first\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, content) => isFirst ? content : "");
      block = block.replace(/\{\{#unless @first\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, content) => isFirst ? "" : content);
      block = block.replace(/\{\{#if @last\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, content) => isLast ? content : "");
      block = block.replace(/\{\{#unless @last\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, content) => isLast ? "" : content);

      // {{@index}} → 0-based, {{@index1}} → 1-based
      block = block.replace(/\{\{@index1\}\}/g, String(idx + 1));
      block = block.replace(/\{\{@index\}\}/g, String(idx));
      // {{author.[0]}} → first char of author field
      block = block.replace(/\{\{(\w+)\.\[0\]\}\}/g, (_: any, k: string) => {
        const val = item[k];
        return val ? String(val)[0] : "";
      });
      // Nested {{field.subfield}} → not supported, skip
      block = block.replace(/\{\{(\w+)\}\}/g, (_: any, k: string) => item[k] ?? "");
      block = block.replace(/\{\{\.\.\/rating_stars\}\}/g, vars.rating_stars || "");
      return block;
    }).join("\n");
  });

  // {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val === undefined || val === null ? "" : String(val);
  });

  return result;
}

// ── Main entry ─────────────────────────────────────────────────────────────
export async function buildSite(data: ScrapeData, apiKey: string, forceTemplate?: string): Promise<GeneratedSite> {
  const content = await generateSiteContent(data, apiKey, forceTemplate);
  const template = content.template;
  const tplDir = path.join(TEMPLATES_DIR, template);

  // Load template files
  const htmlTpl = fs.readFileSync(path.join(tplDir, "index.html"), "utf-8");
  const baseCss = fs.readFileSync(path.join(tplDir, "style.css"), "utf-8");
  const js = fs.readFileSync(path.join(tplDir, "script.js"), "utf-8");

  // Build brand CSS override
  const brandCss = buildBrandCSS(content.brand, template);
  const css = baseCss + "\n\n/* ── AI BRAND OVERRIDE ─────────────────── */\n" + brandCss;

  // Template vars
  const testimonials = pickBestTestimonials(data, 3);
  const galleryImages = data.photos.slice(0, 8);

  // Build services array from content fields
  const services = [
    { name: content.feature_1_title, description: content.feature_1_desc, icon: "◆" },
    { name: content.feature_2_title, description: content.feature_2_desc, icon: "◆" },
    { name: content.feature_3_title, description: content.feature_3_desc, icon: "◆" },
  ].filter(s => s.name);

  // Misc derived vars
  const currentYear = new Date().getFullYear();

  const vars: Record<string, any> = {
    ...content,
    business_name: data.name || "Business",
    category: data.category || "",
    rating: data.rating ?? "",
    total_reviews: data.total_reviews ?? "",
    address: data.address || "",
    phone: data.phone || "",
    website: data.website || "",
    hours: data.hours || "",
    rating_stars: starsHtml(data.rating),
    gallery_image_1: galleryImages[0] || "",
    gallery_image_2: galleryImages[1] || "",
    gallery_image_3: galleryImages[2] || "",
    gallery_image_4: galleryImages[3] || "",
    gallery_images: galleryImages,
    testimonials,
    services,
    current_year: currentYear,
    social_instagram: data.social_instagram || "",
    social_facebook: data.social_facebook || "",
    social_twitter: data.social_twitter || "",
    social_whatsapp: data.social_whatsapp || "",
    year_founded: currentYear - 10,
    tagline: content.hero_description?.split(".")[0] || content.features_title || "",
    hero_headline: content.hero_title || "",
    hero_subheadline: content.hero_description || "",
    about_headline: content.about_title || "",
    about_description: content.about_body || "",
    contact_intro: content.cta_subheading || "",
    email: data.website ? `info@${data.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}` : "",
    stat_1_number: content.feature_count || "100+",
    stat_1_label: content.feature_count_label || "Happy Clients",
    stat_2_number: "98%",
    stat_2_label: "Satisfaction Rate",
    stat_3_number: `${currentYear - (currentYear - 10)}+`,
    stat_3_label: "Years Experience",
  };

  const html = renderTemplate(htmlTpl, vars);
  return { template, html, css, js, content };
}
