import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Download, Palette, Type, ExternalLink, Sparkles,
  Monitor, Smartphone, RefreshCw, Layout, ChevronDown, Check,
} from "lucide-react";

interface BrandPalette {
  primary: string;
  primary_text: string;
  secondary: string;
  bg: string;
  bg2: string;
  bg3: string;
  text: string;
  text_muted: string;
  border: string;
  gradient: string;
  font_heading: string;
  font_body: string;
  font_heading_url: string;
  font_body_url: string;
  palette_name: string;
}

interface SiteContent extends Record<string, any> {
  brand?: BrandPalette;
  template?: string;
  template_reason?: string;
}

interface GeneratedSite {
  template: string;
  html: string;
  css: string;
  js: string;
  content: SiteContent;
}

function buildSrcdoc(site: GeneratedSite): string {
  let html = site.html;
  const importRegex = /@import\s+url\(['"]?(https:\/\/fonts\.googleapis\.com[^'")]+)['"]?\)\s*;?\n?/g;
  const fontLinks: string[] = [];
  const cleanedCss = site.css.replace(importRegex, (_match, url) => {
    fontLinks.push(`<link rel="stylesheet" href="${url}">`);
    return "";
  });
  const fontLinkHtml = fontLinks.join("\n");
  html = html.replace(
    /<link[^>]+href=["']style\.css["'][^>]*\/?>/g,
    `${fontLinkHtml}\n<style>\n${cleanedCss}\n</style>`
  );
  html = html.replace(
    /<script[^>]+src=["']script\.js["'][^>]*><\/script>/g,
    `<script>\n${site.js}\n</script>`
  );
  return html;
}

// ── Design tokens ──────────────────────────────────────────────────────────
const S = {
  bg:       "#0b0a09",
  surface:  "#0f0e0d",
  panel:    "#141210",
  border:   "#2a2520",
  border2:  "#3a3530",
  accent:   "#e8a87c",
  muted:    "#8a7d72",
  muted2:   "#6a5a50",
  text:     "#f5f0eb",
  textSub:  "#c5b8b0",
  card:     "#1a1815",
  radius:   8,
  radius2:  6,
};

function sidebarLabel(text: string, mt = 0) {
  return (
    <p style={{
      fontSize: 10, color: S.muted2, textTransform: "uppercase",
      letterSpacing: "0.1em", marginBottom: 8, marginTop: mt,
    }}>{text}</p>
  );
}

// ── Color swatch with inline picker ───────────────────────────────────────
function ColorRow({
  label, cssVar, color, onChange,
}: {
  label: string; cssVar: string; color: string; onChange: (cssVar: string, val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}
      onClick={() => inputRef.current?.click()}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 6,
        background: color, border: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0, position: "relative", overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,.3)",
      }}>
        <input
          ref={inputRef}
          type="color"
          defaultValue={color.startsWith("#") ? color : "#888888"}
          style={{
            position: "absolute", inset: 0, width: "200%", height: "200%",
            opacity: 0, cursor: "pointer", border: "none",
          }}
          onInput={(e) => onChange(cssVar, (e.target as HTMLInputElement).value)}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: S.muted, marginBottom: 1 }}>{label}</p>
        <p style={{ fontSize: 10, color: S.muted2, fontFamily: "monospace" }}>{color}</p>
      </div>
      <div style={{ color: S.muted2, opacity: 0.5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </div>
    </div>
  );
}

// ── Editable text field ────────────────────────────────────────────────────
function EditableField({
  label, fieldKey, value, multiline, onSave,
}: {
  label: string; fieldKey: string; value: string; multiline?: boolean;
  onSave: (key: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(fieldKey, draft);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {sidebarLabel(label)}
      {editing ? (
        <>
          {multiline ? (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              style={{
                width: "100%", background: S.card, border: `1px solid ${S.accent}`,
                borderRadius: S.radius2, color: S.text, fontSize: 12, padding: "8px 10px",
                fontFamily: "inherit", lineHeight: 1.5, resize: "vertical",
                minHeight: 80, outline: "none",
              }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => e.key === "Enter" && commit()}
              style={{
                width: "100%", background: S.card, border: `1px solid ${S.accent}`,
                borderRadius: S.radius2, color: S.text, fontSize: 12, padding: "7px 10px",
                fontFamily: "inherit", outline: "none",
              }}
            />
          )}
        </>
      ) : (
        <div
          onClick={() => { setEditing(true); setDraft(value); }}
          style={{
            background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius2,
            padding: "7px 10px", fontSize: 12, color: S.textSub, lineHeight: 1.45,
            cursor: "text", transition: "border-color .2s",
            wordBreak: "break-word",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = S.border2)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}
          title="Click to edit"
        >
          {value || <span style={{ color: S.muted2, fontStyle: "italic" }}>—</span>}
        </div>
      )}
    </div>
  );
}

// ── Social link field ─────────────────────────────────────────────────────
function SocialLinkField({
  label, fieldKey, value, placeholder, onSave,
}: {
  label: string; fieldKey: string; value: string; placeholder: string;
  onSave: (key: string, val: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(fieldKey, trimmed);
  }

  const icons: Record<string, string> = {
    social_instagram: "📸",
    social_facebook: "👍",
    social_twitter: "𝕏",
    social_whatsapp: "💬",
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{icons[fieldKey] || "🔗"}</span>
        <p style={{ fontSize: 10, color: S.muted2, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
      </div>
      <input
        type="url"
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === "Enter" && commit()}
        style={{
          width: "100%", background: S.bg, border: `1px solid ${S.border}`,
          borderRadius: S.radius2, color: S.text, fontSize: 11, padding: "6px 10px",
          fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          transition: "border-color .2s",
        }}
        onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
        onBlurCapture={e => (e.currentTarget.style.borderColor = S.border)}
      />
    </div>
  );
}

// ── Template card ──────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "luxury",    label: "Luxury",    emoji: "✦", desc: "Dark, gold, premium" },
  { id: "minimal",   label: "Minimal",   emoji: "○", desc: "Clean, airy, fresh" },
  { id: "playful",   label: "Playful",   emoji: "✸", desc: "Vibrant, fun, bold" },
  { id: "corporate", label: "Corporate", emoji: "□", desc: "Professional, clean" },
];

export default function Editor() {
  const [, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [site, setSite] = useState<GeneratedSite | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [srcdoc, setSrcdoc] = useState("");
  const [tab, setTab] = useState<"template" | "brand" | "content">("brand");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [localColors, setLocalColors] = useState<Record<string, string>>({});
  const [regenLoading, setRegenLoading] = useState(false);
  const [switchingTemplate, setSwitchingTemplate] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  function notify(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2200);
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("whylo_generated");
    const dataRaw = sessionStorage.getItem("whylo_result");
    if (dataRaw) setRawData(JSON.parse(dataRaw));
    if (!raw) {
      if (dataRaw) triggerGenerate(JSON.parse(dataRaw));
      else navigate("/");
      return;
    }
    try {
      const s = JSON.parse(raw) as GeneratedSite;
      setSite(s);
      setSrcdoc(buildSrcdoc(s));
      initLocalColors(s.content?.brand);
    } catch {
      navigate("/");
    }
  }, []);

  function initLocalColors(brand?: BrandPalette) {
    if (!brand) return;
    setLocalColors({
      "--primary":   brand.primary,
      "--secondary": brand.secondary,
      "--bg":        brand.bg,
      "--bg2":       brand.bg2,
      "--text":      brand.text,
      "--text_muted": brand.text_muted,
    });
  }

  async function triggerGenerate(data: any, forceTemplate?: string) {
    setGenerating(true);
    try {
      const body: any = { data };
      if (forceTemplate) body.forceTemplate = forceTemplate;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const s: GeneratedSite = await res.json();
      sessionStorage.setItem("whylo_generated", JSON.stringify(s));
      setSite(s);
      setSrcdoc(buildSrcdoc(s));
      initLocalColors(s.content?.brand);
    } catch (e: any) {
      console.error("Generate failed:", e);
      if (!site) navigate("/results");
    } finally {
      setGenerating(false);
      setSwitchingTemplate(null);
    }
  }

  async function handleSwitchTemplate(templateId: string) {
    if (!rawData || templateId === site?.template) return;
    setSwitchingTemplate(templateId);
    await triggerGenerate(rawData, templateId);
    notify(`Switched to ${templateId} template`);
  }

  async function handleRegen() {
    if (!rawData) return;
    setRegenLoading(true);
    await triggerGenerate(rawData);
    setRegenLoading(false);
    notify("Regenerated with new AI design");
  }

  function sendCssVar(cssVar: string, value: string) {
    iframeRef.current?.contentWindow?.postMessage({ type: "UPDATE_CSS_VAR", key: cssVar, value }, "*");
  }

  function sendField(key: string, value: string) {
    iframeRef.current?.contentWindow?.postMessage({ type: "UPDATE_FIELD", key, value }, "*");
  }

  function handleColorChange(cssVar: string, value: string) {
    setLocalColors(prev => ({ ...prev, [cssVar]: value }));
    sendCssVar(cssVar, value);
  }

  function handleFieldSave(key: string, value: string) {
    sendField(key, value);
    if (site) {
      const updated = { ...site, content: { ...site.content, [key]: value } };
      setSite(updated);
      sessionStorage.setItem("whylo_generated", JSON.stringify(updated));
    }
    notify("Content updated");
  }

  function handleHrefSave(key: string, value: string) {
    // Update live iframe via postMessage
    iframeRef.current?.contentWindow?.postMessage({ type: "UPDATE_HREF", key, value }, "*");
    if (site) {
      // Also patch the rendered HTML directly so downloaded file has the URL
      // Social links use data-editable-href="social_X" and href is already rendered (possibly empty)
      const parser = new DOMParser();
      const doc = parser.parseFromString(site.html, "text/html");
      doc.querySelectorAll(`[data-editable-href="${key}"]`).forEach(el => {
        (el as HTMLAnchorElement).href = value;
        (el as HTMLElement).style.display = value ? "" : "none";
      });
      const updatedHtml = "<!DOCTYPE html>" + doc.documentElement.outerHTML;
      const updated = { ...site, html: updatedHtml, content: { ...site.content, [key]: value } };
      setSite(updated);
      setSrcdoc(buildSrcdoc(updated));
      sessionStorage.setItem("whylo_generated", JSON.stringify(updated));
    }
    notify("Social link updated");
  }

  function downloadHTML() {
    if (!srcdoc) return;
    const blob = new Blob([srcdoc], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${site?.content?.business_name || "website"}.html`;
    a.click();
  }

  function openPreview() {
    if (!srcdoc) return;
    const blob = new Blob([srcdoc], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  if (generating) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ width: 56, height: 56, border: `3px solid ${S.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: S.muted, fontSize: 16 }}>Generating your site with AI…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!site) return null;

  const brand = site.content?.brand;
  const c = site.content || {};

  const colorMap: Array<{ label: string; cssVar: string; brandKey: keyof BrandPalette }> = [
    { label: "Primary",    cssVar: "--primary",   brandKey: "primary" },
    { label: "Secondary",  cssVar: "--secondary",  brandKey: "secondary" },
    { label: "Background", cssVar: "--bg",         brandKey: "bg" },
    { label: "Surface",    cssVar: "--bg2",        brandKey: "bg2" },
    { label: "Text",       cssVar: "--text",       brandKey: "text" },
    { label: "Muted text", cssVar: "--muted",      brandKey: "text_muted" },
    { label: "Border",     cssVar: "--border",     brandKey: "border" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: S.bg, color: S.text, overflow: "hidden" }}>

      {/* ── Toast ── */}
      {notification && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: S.accent, color: S.bg, padding: "10px 20px", borderRadius: 50,
          fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.3)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Check size={13}/> {notification}
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{ height: 52, background: S.panel, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/results")}
            style={{ background: "none", border: "none", cursor: "pointer", color: S.muted, display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "4px 8px", borderRadius: S.radius2, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = S.text)}
            onMouseLeave={e => (e.currentTarget.style.color = S.muted)}
          >
            <ArrowLeft size={14}/> Back
          </button>
          <div style={{ width: 1, height: 20, background: S.border }} />
          <span style={{ fontSize: 13, color: S.accent, textTransform: "capitalize" }}>{site.template}</span>
          {brand?.palette_name && (
            <>
              <div style={{ width: 1, height: 20, background: S.border }} />
              <span style={{ fontSize: 12, color: S.muted2 }}>{brand.palette_name}</span>
            </>
          )}
        </div>

        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.05em", color: S.text }}>Whylo</span>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Viewport toggle */}
          <div style={{ display: "flex", background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius2, padding: 2, gap: 2 }}>
            {(["desktop", "mobile"] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewport(v)}
                style={{
                  background: viewport === v ? S.border2 : "none",
                  border: "none", cursor: "pointer", color: viewport === v ? S.text : S.muted,
                  padding: "4px 8px", borderRadius: 4, display: "flex", alignItems: "center",
                  transition: "all .15s",
                }}
                title={v}
              >
                {v === "desktop" ? <Monitor size={13}/> : <Smartphone size={13}/>}
              </button>
            ))}
          </div>

          {/* Regen */}
          <button
            onClick={handleRegen}
            disabled={regenLoading || !rawData}
            style={{
              background: "none", border: `1px solid ${S.border}`, cursor: "pointer",
              color: regenLoading ? S.muted2 : S.muted, display: "flex", alignItems: "center",
              gap: 6, fontSize: 13, padding: "6px 12px", borderRadius: S.radius2, transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = S.text; e.currentTarget.style.borderColor = S.border2; }}
            onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.border; }}
            title="Regenerate with AI"
          >
            <RefreshCw size={13} style={{ animation: regenLoading ? "spin .8s linear infinite" : "none" }}/> Regenerate
          </button>

          <button
            onClick={openPreview}
            style={{ background: "none", border: `1px solid ${S.border}`, cursor: "pointer", color: S.muted, display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 12px", borderRadius: S.radius2, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = S.text; e.currentTarget.style.borderColor = S.border2; }}
            onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.border; }}
          >
            <ExternalLink size={13}/> Preview
          </button>
          <button
            onClick={downloadHTML}
            style={{ background: S.accent, border: "none", cursor: "pointer", color: S.bg, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: S.radius2, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Download size={13}/> Download
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 272, background: S.surface, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, background: S.panel }}>
            {(["template", "brand", "content"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer",
                  color: tab === t ? S.accent : S.muted,
                  fontSize: 11, fontWeight: tab === t ? 700 : 400,
                  borderBottom: tab === t ? `2px solid ${S.accent}` : "2px solid transparent",
                  transition: "all 0.15s", textTransform: "uppercase", letterSpacing: ".06em",
                }}
              >
                {t === "template" ? "Style" : t === "brand" ? "Brand" : "Content"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>

            {/* ──────── TEMPLATE TAB ──────── */}
            {tab === "template" && (
              <div>
                {sidebarLabel("Switch Template")}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {TEMPLATES.map(tpl => {
                    const isActive = site.template === tpl.id;
                    const isLoading = switchingTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleSwitchTemplate(tpl.id)}
                        disabled={isLoading || !!switchingTemplate}
                        style={{
                          background: isActive ? `${S.accent}18` : S.card,
                          border: `1px solid ${isActive ? S.accent : S.border}`,
                          borderRadius: S.radius, padding: "12px 14px",
                          cursor: isActive ? "default" : "pointer",
                          color: S.text, textAlign: "left", transition: "all .2s",
                          display: "flex", alignItems: "center", gap: 12,
                          opacity: switchingTemplate && !isLoading ? 0.4 : 1,
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = S.border2; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = S.border; }}
                      >
                        <span style={{ fontSize: 18, opacity: 0.7 }}>{tpl.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{tpl.label}</p>
                          <p style={{ fontSize: 11, color: S.muted }}>{tpl.desc}</p>
                        </div>
                        {isLoading && (
                          <div style={{ width: 14, height: 14, border: `2px solid ${S.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }}/>
                        )}
                        {isActive && !isLoading && (
                          <div style={{ width: 18, height: 18, background: S.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={10} color={S.bg}/>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {site.content?.template_reason && (
                  <div style={{ marginTop: 20, background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "12px 14px" }}>
                    <p style={{ fontSize: 10, color: S.muted2, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>AI Reasoning</p>
                    <p style={{ fontSize: 12, color: S.textSub, lineHeight: 1.5 }}>{site.content.template_reason}</p>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  {sidebarLabel("Viewport")}
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["desktop", "mobile"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setViewport(v)}
                        style={{
                          flex: 1, padding: "9px 0",
                          background: viewport === v ? S.accent : S.card,
                          border: `1px solid ${viewport === v ? S.accent : S.border}`,
                          borderRadius: S.radius2, cursor: "pointer",
                          color: viewport === v ? S.bg : S.muted,
                          fontSize: 12, fontWeight: 600, transition: "all .15s",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        {v === "desktop" ? <Monitor size={12}/> : <Smartphone size={12}/>}
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ──────── BRAND TAB ──────── */}
            {tab === "brand" && (
              <div>
                {brand ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <Sparkles size={12} color={S.accent}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: S.accent }}>{brand.palette_name}</span>
                    </div>

                    {sidebarLabel("Colors (click to edit)")}
                    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "8px 12px", marginBottom: 16 }}>
                      {colorMap.map(({ label, cssVar, brandKey }) => {
                        const currentColor = localColors[cssVar] || (brand[brandKey] as string) || "#888";
                        return (
                          <ColorRow
                            key={cssVar}
                            label={label}
                            cssVar={cssVar}
                            color={currentColor}
                            onChange={handleColorChange}
                          />
                        );
                      })}
                    </div>

                    {sidebarLabel("Typography")}
                    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "12px 14px", marginBottom: 16 }}>
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 10, color: S.muted2, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Heading</p>
                        <p style={{ fontSize: 14, color: S.textSub, fontWeight: 600 }}>{brand.font_heading}</p>
                      </div>
                      <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 10 }}>
                        <p style={{ fontSize: 10, color: S.muted2, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Body</p>
                        <p style={{ fontSize: 14, color: S.textSub }}>{brand.font_body}</p>
                      </div>
                    </div>

                    {sidebarLabel("Gradient")}
                    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "10px 12px", marginBottom: 16 }}>
                      <div style={{ height: 36, borderRadius: S.radius2, background: brand.gradient, marginBottom: 8 }}/>
                      <p style={{ fontSize: 10, color: S.muted2, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.4 }}>{brand.gradient}</p>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: S.muted2, textAlign: "center", marginTop: 40 }}>No brand data</p>
                )}
              </div>
            )}

            {/* ──────── CONTENT TAB ──────── */}
            {tab === "content" && (
              <div>
                {sidebarLabel("Business Info")}
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "12px 14px", marginBottom: 16 }}>
                  {[
                    ["Business", "business_name"],
                    ["Category", "category"],
                    ["Phone", "phone"],
                    ["Address", "address"],
                  ].map(([label, key]) => c[key] ? (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 10, color: S.muted2, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 12, color: S.textSub, lineHeight: 1.4 }}>{c[key]}</p>
                    </div>
                  ) : null)}
                  {c.rating && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 10, color: S.muted2, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Rating</p>
                      <p style={{ fontSize: 12, color: S.textSub }}>{c.rating} ★ ({c.total_reviews} reviews)</p>
                    </div>
                  )}
                </div>

                {sidebarLabel("Social Links", 12)}
                <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.radius, padding: "12px 14px", marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: S.muted, marginBottom: 12, lineHeight: 1.5 }}>
                    Add your social links — they'll appear in the contact section and footer.
                  </p>
                  {[
                    ["Instagram", "social_instagram", "https://instagram.com/yourhandle"],
                    ["Facebook", "social_facebook", "https://facebook.com/yourpage"],
                    ["X / Twitter", "social_twitter", "https://x.com/yourhandle"],
                    ["WhatsApp", "social_whatsapp", "https://wa.me/911234567890"],
                  ].map(([label, key, placeholder]) => (
                    <SocialLinkField
                      key={key}
                      label={label}
                      fieldKey={key}
                      value={c[key] || ""}
                      placeholder={placeholder}
                      onSave={handleHrefSave}
                    />
                  ))}
                </div>

                {sidebarLabel("Edit Copy")}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <EditableField label="Hero Headline" fieldKey="hero_title" value={c.hero_title || ""} onSave={handleFieldSave}/>
                  <EditableField label="Hero Description" fieldKey="hero_description" value={c.hero_description || ""} multiline onSave={handleFieldSave}/>
                  <EditableField label="CTA Heading" fieldKey="cta_heading" value={c.cta_heading || ""} onSave={handleFieldSave}/>
                  <EditableField label="CTA Button" fieldKey="cta_primary" value={c.cta_primary || ""} onSave={handleFieldSave}/>
                  <EditableField label="About Title" fieldKey="about_title" value={c.about_title || ""} onSave={handleFieldSave}/>
                  <EditableField label="About Body" fieldKey="about_body" value={c.about_body || ""} multiline onSave={handleFieldSave}/>
                  <EditableField label="Feature 1 Title" fieldKey="feature_1_title" value={c.feature_1_title || ""} onSave={handleFieldSave}/>
                  <EditableField label="Feature 2 Title" fieldKey="feature_2_title" value={c.feature_2_title || ""} onSave={handleFieldSave}/>
                  <EditableField label="Feature 3 Title" fieldKey="feature_3_title" value={c.feature_3_title || ""} onSave={handleFieldSave}/>
                </div>

                <div style={{ marginTop: 20 }}>
                  {sidebarLabel("Actions")}
                  <button
                    onClick={handleRegen}
                    disabled={regenLoading || !rawData}
                    style={{
                      width: "100%", padding: "10px", background: S.card,
                      border: `1px solid ${S.border}`, borderRadius: S.radius,
                      color: regenLoading ? S.muted2 : S.accent, cursor: "pointer",
                      fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, transition: "all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = S.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; }}
                  >
                    <RefreshCw size={13} style={{ animation: regenLoading ? "spin .8s linear infinite" : "none" }}/>
                    {regenLoading ? "Regenerating…" : "Regenerate with AI"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── iframe preview ── */}
        <div style={{ flex: 1, background: "#1a1816", display: "flex", flexDirection: "column", overflow: "hidden", alignItems: "center" }}>
          {/* Browser chrome */}
          <div style={{ width: "100%", height: 36, background: S.panel, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 6, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }}/>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }}/>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }}/>
            <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#4a3f38" }}>
              {site.content?.business_name || "Preview"} — {site.template}
            </div>
            <span style={{ fontSize: 10, color: S.muted2 }}>
              {viewport === "mobile" ? "390px" : "100%"}
            </span>
          </div>

          {/* iframe wrapper */}
          <div style={{
            flex: 1, overflow: "auto", width: "100%",
            display: "flex", justifyContent: "center",
            padding: viewport === "mobile" ? "24px" : "0",
            background: viewport === "mobile" ? "#1a1816" : "transparent",
          }}>
            <div style={{
              width: viewport === "mobile" ? 390 : "100%",
              height: viewport === "mobile" ? "auto" : "100%",
              minHeight: viewport === "mobile" ? 700 : "auto",
              border: viewport === "mobile" ? `1px solid ${S.border2}` : "none",
              borderRadius: viewport === "mobile" ? 16 : 0,
              overflow: "hidden",
              boxShadow: viewport === "mobile" ? "0 8px 40px rgba(0,0,0,.4)" : "none",
            }}>
              <iframe
                ref={iframeRef}
                srcDoc={srcdoc}
                sandbox="allow-scripts allow-same-origin"
                style={{
                  width: "100%",
                  height: viewport === "mobile" ? 800 : "100%",
                  border: "none", background: "#fff", display: "block",
                }}
                title="Site Preview"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${S.border2}; border-radius: 4px; }
      `}</style>
    </div>
  );
}
