import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight, Star, Zap, Globe, MapPin, Sparkles,
  TrendingUp, Users, Clock, Search, Share2, MessageSquare, CheckCircle
} from "lucide-react";

function LoadingDots() {
  return <span className="loading-dots"><span /><span /><span /></span>;
}

function useReveal() {
  useEffect(() => {
    const run = () => {
      const els = document.querySelectorAll(".reveal");
      const obs = new IntersectionObserver(
        (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
        { threshold: 0.1 }
      );
      els.forEach(el => obs.observe(el));
      return () => obs.disconnect();
    };
    const t = setTimeout(run, 100);
    return () => clearTimeout(t);
  }, []);
}

export default function Index() {
  const [, navigate] = useLocation();
  const [focusHero, setFocusHero] = useState(false);
  const [focusCta, setFocusCta] = useState(false);
  const [heroUrl, setHeroUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useReveal();

  const loadingMessages = [
    "Connecting to Google Maps…",
    "Reading your reviews…",
    "Extracting photos…",
    "Analysing what makes you special…",
    "Building your site…",
  ];

  async function handleScrape(url: string) {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    let msgIdx = 0;
    setLoadingMsg(loadingMessages[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIdx]);
    }, 4000);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      clearInterval(msgInterval);
      if (!res.ok || json.error) {
        setError(json.error || "Something went wrong.");
      } else {
        sessionStorage.setItem("whylo_result", JSON.stringify(json.data));
        navigate("/results");
      }
    } catch {
      clearInterval(msgInterval);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const marqueeItems = [
    "Restaurant", "Salon", "Gym", "Clinic", "Hotel", "Cafe",
    "Bakery", "Boutique", "Spa", "Workshop", "Studio", "Agency",
    "Dental", "Coaching", "Photography", "Catering",
  ];

  const benefits = [
    {
      icon: <Search size={20} />,
      title: "Show up when people search",
      desc: "97% of people search online before visiting a local business. Without a site, you're invisible to everyone who hasn't already heard of you."
    },
    {
      icon: <TrendingUp size={20} />,
      title: "Turn visitors into customers",
      desc: "A site with your real reviews, photos, and story converts browsers into walk-ins. Social media posts disappear. Your site works 24/7."
    },
    {
      icon: <Users size={20} />,
      title: "Look as good as you are",
      desc: "Customers judge by first impressions. A polished site signals trust before they've ever met you — especially against competitors who already have one."
    },
    {
      icon: <Share2 size={20} />,
      title: "One link for everything",
      desc: "Menu, hours, location, booking, contact — all in one place. Share it on WhatsApp, Instagram, Google. No more sending people five different places."
    },
    {
      icon: <MessageSquare size={20} />,
      title: "Your reviews, working harder",
      desc: "You've earned those 4.8 stars. A site puts your best reviews front and center, so new customers see the proof before they even walk in."
    },
    {
      icon: <Clock size={20} />,
      title: "Answers questions while you sleep",
      desc: "Hours, price range, what's on the menu, where to park — your site handles every FAQ automatically. Less time on the phone, more time running your business."
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0b0a09", color: "#f5f0eb", overflowX: "hidden" }}>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-logo">Whylo</span>
          <div className="nav-links">
            <a href="#why" className="nav-link">Why a website</a>
            <a href="#how" className="nav-link">How it works</a>
            <button className="btn-primary" onClick={() => document.getElementById("hero-input")?.focus()}>
              Try it free
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero dot-grid">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="badge fade-up anim-delay-1">
            <Zap size={12} /> Every local business deserves a website
          </div>
          <h1 className="fade-up anim-delay-2">
            Your business has<br />
            <span className="accent">a story to tell.</span><br />
            We tell it.
          </h1>
          <p className="hero-sub fade-up anim-delay-3">
            Paste your Google Maps link. We read every review, pull your photos, and build a real website written in your customers' own words. Live in under a minute.
          </p>
          <div className="input-row fade-up anim-delay-4">
            <input
              id="hero-input"
              className="url-input"
              type="text"
              placeholder="Paste your Google Maps link…"
              value={heroUrl}
              onChange={e => setHeroUrl(e.target.value)}
              onFocus={() => setFocusHero(true)}
              onBlur={() => setFocusHero(false)}
              onKeyDown={e => e.key === "Enter" && handleScrape(heroUrl)}
              style={{ borderColor: focusHero ? "#e8a87c" : "#2a2420" }}
              disabled={loading}
            />
            <button className="btn-primary btn-large" onClick={() => handleScrape(heroUrl)} disabled={loading}>
              {loading ? <LoadingDots /> : <>Build my site <ArrowRight size={16} /></>}
            </button>
          </div>
          <p className="hint fade-up anim-delay-5">Free · No account · No code · Live in 60 seconds</p>
        </div>

        {/* Browser mock */}
        <div className="mock-wrap fade-up anim-delay-5">
          <div className="browser">
            <div className="browser-bar">
              <div className="dot red" /><div className="dot yellow" /><div className="dot green" />
              <div className="url-bar">roys-kitchen.whylo.com</div>
            </div>
            <div className="browser-body">
              <span className="mock-tag">Authentic Indian Cuisine · Mumbai</span>
              <h2 className="mock-h">
                The biryani people<br />
                <span className="accent">keep coming back for.</span>
              </h2>
              <p className="mock-p">
                "Best mutton biryani in the city — my family drives 40 minutes for this." That's what hundreds of our customers say. Come find out why.
              </p>
              <div className="mock-btns">
                <div className="mock-btn-p">Reserve a table</div>
                <div className="mock-btn-s">View menu</div>
              </div>
              <div className="mock-stars">
                <div className="stars">{[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#e8a87c" stroke="none" />)}</div>
                4.8 · Powered by Whylo
              </div>
            </div>
          </div>
          <div className="mock-glow" />
        </div>
      </section>

      {/* Loading / Error */}
      <div ref={resultsRef} style={{ scrollMarginTop: 80 }}>
        {loading && (
          <div className="results-panel">
            <div className="results-loading">
              <div className="spinner" />
              <p className="loading-status">{loadingMsg}</p>
              <p style={{ fontSize: 13, color: "#4a3f38", marginTop: 8 }}>Takes 30–60 seconds. Sit tight.</p>
            </div>
          </div>
        )}
        {!loading && error && (
          <div className="results-panel">
            <div className="results-error">
              <p style={{ color: "#e87c7c", fontWeight: 500, marginBottom: 8 }}>Couldn't read that URL</p>
              <p style={{ fontSize: 14, color: "#8a7d72" }}>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="marquee-item">
              <span className="marquee-dot" />{item}
            </span>
          ))}
        </div>
      </div>

      {/* WHY EVERY BUSINESS NEEDS A WEBSITE */}
      <section id="why" className="section" style={{ borderTop: "1px solid #2a2420" }}>
        <div className="wrap">
          <div className="why-header">
            <div>
              <p className="section-label reveal">The reality</p>
              <h2 className="section-h reveal">
                Your customers are<br /><span className="text-italic">already searching.</span>
              </h2>
            </div>
            <p className="why-sub reveal">
              Whether you like it or not, people Google your business before they visit. If they land on nothing — or worse, a competitor — you've already lost them. A website isn't a luxury anymore. It's the baseline.
            </p>
          </div>

          <div className="benefits-grid">
            {benefits.map((b, i) => (
              <div key={i} className={`benefit-card reveal scroll-delay-${i % 3}`}>
                <div className="benefit-icon">{b.icon}</div>
                <h3 className="benefit-h">{b.title}</h3>
                <p className="benefit-p">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Mid-section CTA */}
          <div className="mid-cta reveal">
            <p className="mid-cta-text">Your Google Maps link is all you need.</p>
            <div className="input-row mid-cta-row">
              <input
                className="url-input"
                type="text"
                placeholder="maps.google.com/place/your-business…"
                value={heroUrl}
                onChange={e => setHeroUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScrape(heroUrl)}
                style={{ borderColor: "#2a2420" }}
                disabled={loading}
              />
              <button className="btn-primary btn-large" onClick={() => handleScrape(heroUrl)} disabled={loading}>
                {loading ? <LoadingDots /> : <>Get my site <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section" style={{ borderTop: "1px solid #2a2420", background: "#0e0c0a" }}>
        <div className="wrap center">
          <p className="section-label reveal">The process</p>
          <h2 className="section-h reveal">Three steps.<br /><span className="text-italic">One minute.</span></h2>
          <p className="section-sub reveal">No design skills. No copywriting. No developer. Just a link.</p>
        </div>
        <div className="wrap">
          <div className="how-steps">

            <div className="how-step reveal">
              <div className="how-step-left">
                <div className="how-num">01</div>
                <div className="how-line" />
              </div>
              <div className="how-step-right">
                <div className="how-icon-wrap"><MapPin size={20} color="#e8a87c" /></div>
                <h3 className="how-h">Paste your Google Maps link</h3>
                <p className="how-p">Open Google Maps, find your business, and copy the URL from the address bar. That's it. We take it from there.</p>
                <div className="how-example">
                  <span className="how-example-label">Example</span>
                  <code className="how-example-code">maps.google.com/place/Roys+Kitchen/...</code>
                </div>
              </div>
            </div>

            <div className="how-step reveal scroll-delay-1">
              <div className="how-step-left">
                <div className="how-num">02</div>
                <div className="how-line" />
              </div>
              <div className="how-step-right">
                <div className="how-icon-wrap"><Sparkles size={20} color="#e8a87c" /></div>
                <h3 className="how-h">AI reads every review</h3>
                <p className="how-p">We scrape your real customer reviews — hundreds of them. The AI finds the exact phrases people use, what they rave about, what keeps them coming back. Then it writes copy using your customers' own words.</p>
                <div className="how-pills">
                  <span className="how-pill positive">Pulls real quotes</span>
                  <span className="how-pill">Finds your USP</span>
                  <span className="how-pill">Detects trust signals</span>
                  <span className="how-pill">Extracts your best photos</span>
                </div>
              </div>
            </div>

            <div className="how-step reveal scroll-delay-2">
              <div className="how-step-left">
                <div className="how-num">03</div>
              </div>
              <div className="how-step-right">
                <div className="how-icon-wrap"><Globe size={20} color="#e8a87c" /></div>
                <h3 className="how-h">Your site goes live</h3>
                <p className="how-p">A complete site — hero, features, real testimonials, photos, contact — ready to share. Edit the copy, swap colors, make it yours. Then publish with one click.</p>
                <div className="how-url-preview">
                  <div className="how-url-dot" />
                  <span>yourname.whylo.com</span>
                  <span className="how-url-live">● Live</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section" style={{ borderTop: "1px solid #2a2420" }}>
        <div className="wrap center">
          <p className="section-label reveal">From real business owners</p>
          <h2 className="section-h reveal">Their reviews built<br /><span className="text-italic">their websites.</span></h2>
        </div>
        <div className="wrap">
          <div className="testi-grid">
            {[
              { text: "I pasted my Maps link and had a site live in under a minute. The copy was better than anything I'd written myself after two weeks of trying.", name: "Arjun S.", role: "Restaurant owner, Mumbai", rating: 5 },
              { text: "We tried agencies, freelancers, site builders. This just worked. The AI pulled the exact words our customers use — we didn't change a thing.", name: "Priya M.", role: "Salon owner, Bengaluru", rating: 5 },
              { text: "Genuinely shocked. It read all my reviews and built a page that sounds exactly like us. Our bookings went up the same week we launched.", name: "Rohan T.", role: "Gym owner, Delhi", rating: 5 },
            ].map((t, i) => (
              <div key={i} className={`testi-card reveal scroll-delay-${i}`}>
                <div className="testi-stars">{[...Array(t.rating)].map((_, j) => <Star key={j} size={14} fill="#e8a87c" stroke="none" />)}</div>
                <p className="testi-q">"{t.text}"</p>
                <div className="testi-footer">
                  <div className="testi-avatar">{t.name[0]}</div>
                  <div>
                    <p className="testi-name">{t.name}</p>
                    <p className="testi-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section dot-grid" style={{ borderTop: "1px solid #2a2420" }}>
        <div className="cta-glow" />
        <div className="cta-inner">
          <div className="cta-badge reveal"><CheckCircle size={14} /> Free · No account needed</div>
          <h2 className="cta-h reveal">
            Every business<br />
            <span style={{ color: "#e8a87c", fontStyle: "italic" }}>deserves a website.</span>
          </h2>
          <p className="cta-sub reveal">
            You've already done the hard part. You built something people love. We just make sure the world can find it.
          </p>
          <div className="input-row reveal">
            <input
              className="url-input"
              type="text"
              placeholder="Paste your Google Maps link…"
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              onFocus={() => setFocusCta(true)}
              onBlur={() => setFocusCta(false)}
              onKeyDown={e => e.key === "Enter" && handleScrape(ctaUrl)}
              style={{ borderColor: focusCta ? "#e8a87c" : "#2a2420" }}
              disabled={loading}
            />
            <button className="btn-primary btn-large" onClick={() => handleScrape(ctaUrl)} disabled={loading}>
              {loading ? <LoadingDots /> : <>Build my site <ArrowRight size={16} /></>}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 16 }}>Takes under 60 seconds · No credit card · No code</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-logo">Whylo</span>
          <p className="footer-copy">© 2025 Whylo. Every business deserves a website.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
