import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Star, MapPin, Phone, Clock, Globe,
  ThumbsUp, ThumbsDown, Minus, ArrowLeft, ArrowRight, Zap
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
interface Review {
  author: string | null;
  badge: string | null;
  rating: number | null;
  date: string | null;
  text: string | null;
  owner_reply: string | null;
  sentiment: "positive" | "negative" | "neutral" | null;
}

interface ScrapeResult {
  name: string | null;
  category: string | null;
  rating: number | null;
  total_reviews: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  photos: string[];
  reviews: Review[];
  review_count_scraped: number;
}

function Stars({ count, size = 14 }: { count: number | null; size?: number }) {
  if (!count) return null;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= count ? "#e8a87c" : "transparent"}
          stroke={i <= count ? "#e8a87c" : "#4a3f38"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export default function Results() {
  const [, navigate] = useLocation();
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("whylo_result");
    if (!raw) {
      navigate("/");
      return;
    }
    try {
      setResult(JSON.parse(raw));
    } catch {
      navigate("/");
    }
  }, []);

  async function handleGenerate() {
    if (!result) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Generation failed");
      }
      const site = await res.json();
      sessionStorage.setItem("whylo_generated", JSON.stringify(site));
      navigate("/editor");
    } catch (e: any) {
      setGenError(e.message || "Something went wrong");
      setGenerating(false);
    }
  }

  if (!result) return null;

  const sentimentCounts = {
    positive: result.reviews.filter(r => r.sentiment === "positive").length,
    negative: result.reviews.filter(r => r.sentiment === "negative").length,
    neutral: result.reviews.filter(r => r.sentiment === "neutral").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0a09", color: "#f5f0eb" }}>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-logo">Whylo</span>
          <div className="nav-links">
            <button
              className="nav-link"
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#8a7d72", fontSize: 14 }}
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 80px" }}>

        {/* ── Business card ── */}
        <div className="biz-card" style={{ marginBottom: 32 }}>
          <div className="biz-card-main">
            <div>
              {result.category && <span className="biz-tag">{result.category}</span>}
              <h2 className="biz-name">{result.name || "Unknown Business"}</h2>
              <div className="biz-meta">
                {result.rating && (
                  <span className="biz-rating">
                    <Stars count={Math.round(result.rating)} size={16} />
                    <strong style={{ color: "#f5f0eb", marginLeft: 6 }}>{result.rating}</strong>
                    {result.total_reviews && (
                      <span style={{ color: "#8a7d72" }}> · {result.total_reviews.toLocaleString()} reviews</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="biz-info">
              {result.address && (
                <div className="biz-info-row">
                  <MapPin size={14} style={{ color: "#e8a87c", flexShrink: 0, marginTop: 2 }} />
                  <span>{result.address}</span>
                </div>
              )}
              {result.phone && (
                <div className="biz-info-row">
                  <Phone size={14} style={{ color: "#e8a87c", flexShrink: 0 }} />
                  <span>{result.phone}</span>
                </div>
              )}
              {result.hours && (
                <div className="biz-info-row">
                  <Clock size={14} style={{ color: "#e8a87c", flexShrink: 0 }} />
                  <span>{result.hours}</span>
                </div>
              )}
              {result.website && (
                <div className="biz-info-row">
                  <Globe size={14} style={{ color: "#e8a87c", flexShrink: 0 }} />
                  <a
                    href={result.website.startsWith("http") ? result.website : `https://${result.website}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#e8a87c", textDecoration: "none" }}
                  >
                    {result.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Sentiment summary */}
          {result.reviews.length > 0 && (
            <div className="sentiment-bar">
              <p className="sentiment-label">Sentiment across {result.review_count_scraped} scraped reviews</p>
              <div className="sentiment-pills">
                <div className="sentiment-pill positive">
                  <ThumbsUp size={13} /> {sentimentCounts.positive} positive
                </div>
                <div className="sentiment-pill neutral">
                  <Minus size={13} /> {sentimentCounts.neutral} neutral
                </div>
                <div className="sentiment-pill negative">
                  <ThumbsDown size={13} /> {sentimentCounts.negative} negative
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Photos grid ── */}
        {result.photos && result.photos.length > 0 && (
          <div className="photos-section" style={{ marginBottom: 40 }}>
            <h3 className="results-section-h">
              Photos <span className="results-count">{result.photos.length}</span>
            </h3>
            <div className="photos-grid">
              {result.photos.map((src, i) => (
                <div key={i} className="photo-cell">
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="photo-img"
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reviews ── */}
        <div className="reviews-section" style={{ marginBottom: 40 }}>
          <h3 className="results-section-h">
            Reviews <span className="results-count">{result.reviews.length}</span>
          </h3>
          {result.reviews.length === 0 ? (
            <div style={{ padding: "24px", background: "#1a1510", borderRadius: 12, border: "1px solid #2a2420", color: "#8a7d72", fontSize: 14 }}>
              No reviews scraped — Google may have blocked access for this listing. Try re-pasting the URL.
            </div>
          ) : (
            <div className="reviews-list">
              {result.reviews.map((rev, i) => (
                <div key={i} className={`review-card review-${rev.sentiment || "neutral"}`}>
                  <div className="review-header">
                    <div className="review-avatar">
                      {(rev.author || "?")[0].toUpperCase()}
                    </div>
                    <div className="review-meta">
                      <span className="review-author">{rev.author || "Anonymous"}</span>
                      {rev.badge && <span className="review-badge">{rev.badge}</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Stars count={rev.rating} size={13} />
                        {rev.date && <span className="review-date">{rev.date}</span>}
                      </div>
                    </div>
                    {rev.sentiment && (
                      <div className={`review-sentiment-dot ${rev.sentiment}`} title={rev.sentiment} />
                    )}
                  </div>
                  {rev.text && <p className="review-text">{rev.text}</p>}
                  {rev.owner_reply && (
                    <div className="owner-reply">
                      <span className="owner-reply-label">Owner reply</span>
                      <p className="owner-reply-text">{rev.owner_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="results-cta">
          <h3 className="results-cta-h">Ready to turn these reviews into a site?</h3>
          <p className="results-cta-sub">
            We'll use this data to generate a high-converting landing page in under 60 seconds.
          </p>
          {genError && (
            <p style={{ color: "#e85d5d", fontSize: 13, marginBottom: 12, background: "#2a0a0a", padding: "8px 14px", borderRadius: 8, border: "1px solid #5a1a1a" }}>
              {genError}
            </p>
          )}
          <button
            className="btn-primary"
            style={{ fontSize: 16, padding: "14px 32px", display: "inline-flex", alignItems: "center", gap: 8, opacity: generating ? 0.7 : 1, cursor: generating ? "not-allowed" : "pointer" }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid #0b0a09", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Generating...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : (
              <><Zap size={16} /> Generate my site <ArrowRight size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
