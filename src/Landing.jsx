import { useEffect, useRef, useState } from "react";
import { questions } from "./questions";
import "./Landing.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const ACCENT = "#b8d3ee";
const STAR_DENSITY = 1;
const METEORS = true;

const FAQ = [
  {
    q: "Do I need an account?",
    a: "No. Every test and question set opens without one. An account only saves your progress, score history, and skill breakdown so they follow you across devices.",
  },
  {
    q: "Does this match the current test format?",
    a: "Yes. Two Reading and Writing modules, two Math modules, and module two adapts based on how you did on module one, the way the digital test does.",
  },
  {
    q: "How long is a full test?",
    a: "Two hours and fourteen minutes including the built in break. Single sections can be run on their own when that is all the time you have.",
  },
  {
    q: "Where do the questions come from?",
    a: "They are written against the published skill outline and checked against released practice material. Nothing here is taken from a live exam.",
  },
  {
    q: "Can I use a calculator?",
    a: "A built in graphing calculator is available on both Math modules, the same as on test day.",
  },
  {
    q: "What happens if I run out of time on a section?",
    a: "The section closes and gets scored as it stands. Pacing is part of what the report measures, so an unfinished module is useful information rather than a wasted attempt.",
  },
  {
    q: "Does it work on a phone?",
    a: "Practice sets and review do. Full length tests want a laptop or tablet, since that is what you will sit the real one on.",
  },
  {
    q: "How is the score estimate calculated?",
    a: "Raw correct counts are mapped onto the released scoring curve. Treat the output as a range rather than a single number, especially on your first two attempts.",
  },
];

// Hue and saturation of the accent, used to tint the star field. Most stars
// sit near this hue; a few run warm, as in a real field.
function tintHS(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return { h: 212, s: 16 };
  const v = parseInt(m[1], 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: hue, s: Math.min(s * 100, 60) };
}

// Parallax star field with sparse meteors, painted behind the hero. Separate
// from the app's Starfield component: this one tracks the pointer and drifts
// the planet with it, which only makes sense on a single full-bleed hero.
function useHeroStarfield(canvasRef, planetRef) {
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;

    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const rand = (a, b) => a + Math.random() * (b - a);

    let stars = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    function build() {
      const tint = tintHS(ACCENT);
      const rect = cv.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(((w * h) / 4200) * STAR_DENSITY);
      stars = Array.from({ length: n }, () => {
        const depth = Math.random();
        const warm = Math.random() < 0.16;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          d: depth,
          r: rand(0.28, 0.5) + depth * rand(0.2, 0.95),
          base: 0.14 + depth * rand(0.25, 0.72),
          hue: warm ? (tint.h + 180) % 360 : (tint.h + rand(-13, 13) + 360) % 360,
          sat: warm ? tint.s * 1.6 + 12 : Math.max(tint.s * rand(0.35, 1.15), 4),
          tw: rand(0.55, 2.1),
          ph: Math.random() * Math.PI * 2,
        };
      });
    }

    // --- meteors: slow, sparse, tapered streaks ---
    let meteors = [];
    let nextSpawn = 1.4;

    function spawn() {
      const ang = rand(0.34, 0.62); // radians, down-right
      const speed = rand(26, 58); // px/s — slow crossings, 8-20s
      const fromTop = Math.random() < 0.62;
      return {
        x: fromTop ? rand(-0.1, 0.85) * w : rand(-0.25, -0.02) * w,
        y: fromTop ? rand(-0.18, -0.02) * h : rand(0, 0.55) * h,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        len: rand(90, 230),
        t: 0,
        ttl: rand(6, 13),
        peak: rand(0.32, 0.62),
      };
    }

    function drawMeteors(dt) {
      nextSpawn -= dt;
      if (nextSpawn <= 0 && meteors.length < 2) {
        meteors.push(spawn());
        nextSpawn = rand(3.4, 8);
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.t += dt;
        if (m.t > m.ttl) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const p = m.t / m.ttl;
        // fade in fast, hold, fade out slower
        const env = p < 0.14 ? p / 0.14 : p > 0.62 ? 1 - (p - 0.62) / 0.38 : 1;
        const a = m.peak * Math.max(env, 0);
        if (a <= 0.002) continue;
        const mag = Math.hypot(m.vx, m.vy) || 1;
        const tx = m.x - (m.vx / mag) * m.len;
        const ty = m.y - (m.vy / mag) * m.len;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `hsla(210, 24%, 97%, ${a})`);
        g.addColorStop(0.16, `hsla(208, 30%, 90%, ${a * 0.45})`);
        g.addColorStop(1, "hsla(208, 30%, 88%, 0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.25;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 7);
        hg.addColorStop(0, `hsla(206, 30%, 99%, ${a * 0.85})`);
        hg.addColorStop(1, "hsla(206, 30%, 99%, 0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let mx = 0;
    let my = 0;
    let sx = 0;
    let sy = 0;
    let t0 = performance.now();

    function onMove(e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function draw(now) {
      const dt = Math.min((now - t0) / 1000, 0.05);
      t0 = now;
      // spring toward the pointer rather than snapping to it
      sx += (mx - sx) * Math.min(dt * 4.2, 1);
      sy += (my - sy) * Math.min(dt * 4.2, 1);
      const time = now / 1000;

      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const px = s.x - sx * (6 + s.d * 30) + (reduce ? 0 : Math.sin(time * 0.014 + s.ph) * s.d * 4);
        const py = s.y - sy * (4 + s.d * 20);
        const tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(time * s.tw + s.ph);
        const a = s.base * tw;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${86 + s.d * 12}%, ${a})`;
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.d > 0.87) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, s.r * 9);
          g.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, 92%, ${a * 0.32})`);
          g.addColorStop(1, "hsla(0,0%,100%,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduce && METEORS) drawMeteors(dt);
      const pl = planetRef.current;
      if (pl && !reduce) {
        pl.style.transform = `translate3d(${(-sx * 16).toFixed(2)}px, ${(-sy * 10).toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(draw);
    }

    build();
    const ro = new ResizeObserver(build);
    ro.observe(cv);
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [canvasRef, planetRef]);
}

// Reveal-on-scroll. Elements entering together are staggered by their
// position in the batch, so a group of co-visible cards cascades instead of
// every third one resetting to 0ms.
function useReveals(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = root.querySelectorAll("[data-reveal]");
    if (!nodes.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        entering.forEach((e, i) => {
          e.target.style.transitionDelay = `${Math.min(i, 5) * 55}ms`;
          e.target.setAttribute("data-inview", "");
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [rootRef]);
}

function Landing({ onEnter }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const planetRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(-1);

  useHeroStarfield(canvasRef, planetRef);
  useReveals(rootRef);

  return (
    <div className="landing" ref={rootRef}>
      <section className="vg-hero">
        <canvas ref={canvasRef} className="vg-hero-canvas" aria-hidden="true" />

        <div ref={planetRef} className="vg-hero-planet" aria-hidden="true">
          <img src="/landing/hero.jpg" alt="" fetchPriority="high" />
        </div>
        <div className="vg-hero-bloom" aria-hidden="true"></div>
        <div className="vg-hero-scrim" aria-hidden="true"></div>

        <div className="vg-hero-inner">
          <header className="vg-header" data-rise>
            <div className="vg-wordmark">
              <div className="vg-wordmark-dot" aria-hidden="true"></div>
              <span className="vg-wordmark-text">Vega</span>
            </div>
            <nav className="vg-nav">
              <button type="button" className="vg-nav-link" onClick={() => onEnter(null)}>
                Practice sets
              </button>
              <button type="button" className="vg-pill" onClick={() => onEnter(null)}>
                <span className="vg-pill-dot" aria-hidden="true"></span>
                Orrery
              </button>
            </nav>
          </header>

          <main className="vg-hero-main">
            <div className="vg-eyebrow" data-rise>
              <span className="vg-eyebrow-dot" aria-hidden="true"></span>
              Full question bank, open to everyone
            </div>

            <h1 className="vg-hero-title" data-rise>
              Navigate the SAT
            </h1>

            <div className="vg-hero-cta" data-rise>
              <button type="button" className="vg-btn-primary" onClick={() => onEnter(null)}>
                Start practicing
              </button>
              <button
                type="button"
                className="vg-btn-ghost"
                onClick={() => onEnter({ type: "browse" })}
              >
                Browse the question bank
              </button>
            </div>
          </main>

          <footer className="vg-hero-footer" data-rise>
            <div className="vg-stats">
              <div className="vg-stat">
                <span className="vg-stat-value">{questions.length.toLocaleString()}</span>
                <span>Questions in bank</span>
              </div>
            </div>
            <span className="vg-hero-note">
              No account needed to start. Progress saves the moment you make one.
            </span>
          </footer>
        </div>
      </section>

      <section id="faq" className="vg-section vg-section-top">
        <div className="vg-faq-wrap">
          <h2 className="vg-h2" data-reveal>
            Questions people ask first
          </h2>
          <div className="vg-faq-list">
            {FAQ.map((f, i) => (
              <div
                key={f.q}
                className="vg-faq-item"
                data-open={openFaq === i ? "" : undefined}
                data-reveal
              >
                <button
                  type="button"
                  className="vg-faq-q"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq((o) => (o === i ? -1 : i))}
                >
                  {f.q}
                  <span className="vg-faq-icon" aria-hidden="true"></span>
                </button>
                <div className="vg-faq-a">
                  <div>
                    <p>{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="vg-section">
        <div className="vg-account" data-reveal>
          <div className="vg-account-copy">
            <h2>Keep your score history in one place</h2>
            <p>
              An account saves your tests, your skill breakdown, and where you left off. Everything
              on this site works without one.
            </p>
          </div>
          <button type="button" className="vg-account-btn" onClick={() => onEnter(null)}>
            Create a free account
          </button>
        </div>
      </section>
    </div>
  );
}

export default Landing;
