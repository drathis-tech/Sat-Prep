import { useEffect, useRef, useState } from "react";
import { domainGroups, filterQuestions, searchQuestions, subjectLabel } from "./quizUtils";
import PracticeMode from "./PracticeMode";
import TimedTest from "./TimedTest";
import BrowsePanel from "./BrowsePanel";
import { useScreenFade } from "./useScreenFade";
import "./ConceptOrrery.css";

const CONCEPTS = [
  {
    slug: "algebra",
    catalog: "M-01",
    name: "Algebra & Equations",
    subject: "math",
    domain: "Algebra",
    hi: "#8fb3f5",
    base: "#2c56c4",
    sh: "#142a63",
    ring: "horizontal",
    surface: "swirlband",
    desc: "Linear equations, inequalities, functions, and systems — the algebraic foundation of the digital SAT's Math section.",
  },
  {
    slug: "reading",
    catalog: "E-01",
    name: "Reading & Comprehension",
    subject: "reading_writing",
    domain: "Information and Ideas",
    hi: "#f8cf82",
    base: "#d68a1f",
    sh: "#6e4109",
    ring: null,
    surface: "tonal",
    desc: "Drawing accurate conclusions from short passages spanning literature, science, and history — central ideas, evidence, and inference.",
  },
  {
    slug: "geometry",
    catalog: "M-02",
    name: "Geometry & Trigonometry",
    subject: "math",
    domain: "Geometry and Trigonometry",
    hi: "#7fdde3",
    base: "#16828f",
    sh: "#0b3d44",
    ring: null,
    surface: "banded",
    desc: "Angles, triangles, circles, and the right-triangle trig ratios that connect them — the SAT's most visual math domain.",
  },
  {
    slug: "grammar",
    catalog: "E-02",
    name: "Grammar & Syntax",
    subject: "reading_writing",
    domain: "Standard English Conventions",
    hi: "#f2a184",
    base: "#c1471f",
    sh: "#5c1f0c",
    ring: null,
    surface: "softband",
    desc: "The rules of Standard English — sentence boundaries, punctuation, and structure tested in isolation.",
  },
  {
    slug: "statistics",
    catalog: "M-03",
    name: "Statistics & Data",
    subject: "math",
    domain: "Problem-Solving and Data Analysis",
    hi: "#ac9ff2",
    base: "#5d51c9",
    sh: "#2d2669",
    ring: "horizontal",
    surface: "marbled",
    desc: "Reading tables and scatterplots, and reasoning about ratios, percentages, probability, and study design.",
  },
  {
    slug: "rhetoric",
    catalog: "E-03",
    name: "Rhetoric & Argument",
    subject: "reading_writing",
    domain: "Expression of Ideas",
    hi: "#e4a0bd",
    base: "#af3a68",
    sh: "#551a30",
    ring: null,
    surface: "marbled",
    desc: "How writers build a case — transitions between ideas, and synthesizing evidence into a coherent argument.",
  },
  {
    slug: "functions",
    catalog: "M-04",
    name: "Advanced Functions",
    subject: "math",
    domain: "Advanced Math",
    hi: "#bb90e6",
    base: "#7f3cac",
    sh: "#3d1b54",
    ring: "tilted",
    surface: "banded",
    desc: "Nonlinear equations and functions, and the equivalent-expression manipulation that connects them.",
  },
  {
    slug: "vocabulary",
    catalog: "E-04",
    name: "Vocabulary & Context",
    subject: "reading_writing",
    domain: "Craft and Structure",
    hi: "#e8a97a",
    base: "#b1531c",
    sh: "#55270c",
    ring: null,
    surface: "swirl",
    desc: "Choosing the precise word a sentence demands, and reading how structure and cross-text connections shape meaning.",
  },
];

const byslug = Object.fromEntries(CONCEPTS.map((c) => [c.slug, c]));

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const EMPTY_FILTER = { subject: "all", domain: null, skill: null, searchQuery: null };

// A single one-shot comet pass: a start point well outside the viewport,
// travel in a straight line through (near) the visible area, to an exit
// point equally far outside the opposite side.
function makeComet(id) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cx = w / 2;
  const cy = h / 2;
  const travelAngle = Math.random() * Math.PI * 2;
  const perpAngle = travelAngle + Math.PI / 2;
  const offset = (Math.random() - 0.5) * Math.max(w, h) * 0.7;
  const lineCx = cx + Math.cos(perpAngle) * offset;
  const lineCy = cy + Math.sin(perpAngle) * offset;
  const radius = Math.hypot(w, h) / 2 + 200;
  const startX = lineCx - Math.cos(travelAngle) * radius;
  const startY = lineCy - Math.sin(travelAngle) * radius;
  const dx = Math.cos(travelAngle) * radius * 2;
  const dy = Math.sin(travelAngle) * radius * 2;
  const angleDeg = (travelAngle * 180) / Math.PI;
  const duration = 1.5 + Math.random(); // 1.5-2.5s
  const length = 130 + Math.random() * 90; // 130-220px

  return { id, startX, startY, dx, dy, angleDeg, duration, length };
}

function ConceptPanel({ concept, onBack, onStartPractice, onStartSkill }) {
  const [tab, setTab] = useState("practice"); // practice | drill
  const group = domainGroups.find((g) => g.domain === concept.domain);
  const skills = group ? group.skills : [];

  return (
    <div className="concept-panel" style={{ "--planet-base": concept.base }}>
      <span className="concept-watermark" aria-hidden="true">
        {concept.catalog}
      </span>
      <button type="button" className="back-link" onClick={onBack}>
        &larr; Return to Orrery
      </button>
      <span className="concept-cat">
        {concept.catalog} &middot; {concept.subject === "math" ? "Mathematics" : "Reading & Writing"}
      </span>
      <h2>{concept.name}</h2>
      <p className="concept-desc">{concept.desc}</p>

      <div className="concept-tabs" role="tablist" aria-label="Study approach">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "practice"}
          className={`concept-tab${tab === "practice" ? " active" : ""}`}
          onClick={() => setTab("practice")}
        >
          Practice
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "drill"}
          className={`concept-tab${tab === "drill" ? " active" : ""}`}
          onClick={() => setTab("drill")}
        >
          Drill a Skill
        </button>
      </div>

      {tab === "practice" ? (
        <>
          <p className="concept-tab-desc">Mixed questions across every skill in this domain.</p>
          <button type="button" className="concept-start-btn" onClick={() => onStartPractice(concept)}>
            Practice {concept.name}
          </button>
        </>
      ) : (
        <>
          <span className="concept-sub-label">Choose a skill to drill</span>
          <ul className="concept-skill-list">
            {skills.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="concept-skill-btn"
                  onClick={() => onStartSkill(concept, s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ConceptOrrery() {
  const triggerFade = useScreenFade();
  const [screen, setScreen] = useState("menu"); // menu | concept | practice | timed
  const [activeSlug, setActiveSlug] = useState(null);
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [comets, setComets] = useState([]);
  const cometIdRef = useRef(0);

  const active = activeSlug ? byslug[activeSlug] : null;

  // ---------- Comets ----------
  // Two independent, randomly-staggered schedulers each re-arm on their own
  // 8-15s timer, so at most a couple of comets are ever in flight at once.
  useEffect(() => {
    if (window.matchMedia && window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    let cancelled = false;
    const timeouts = [];

    function scheduleComet() {
      const delay = 8000 + Math.random() * 7000; // 8-15s
      const t = setTimeout(() => {
        if (cancelled) return;
        const id = cometIdRef.current++;
        setComets((cs) => [...cs, makeComet(id)]);
        scheduleComet();
      }, delay);
      timeouts.push(t);
    }

    scheduleComet();
    timeouts.push(setTimeout(scheduleComet, 4000 + Math.random() * 4000));

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  function removeComet(id) {
    setComets((cs) => cs.filter((c) => c.id !== id));
  }

  // ---------- Navigation ----------
  // Opening/closing a concept panel is a same-view detail disclosure (it has
  // its own quick CSS crossfade) — only real mode changes (into/out of a
  // practice or timed session) get the screen fade.
  function openConcept(slug) {
    setActiveSlug(slug);
    setScreen("concept");
  }

  function closeConcept() {
    setActiveSlug(null);
    setScreen("menu");
  }

  function startPractice(nextFilter) {
    const variant = screen === "practice" ? "light" : "full";
    triggerFade(variant, () => {
      setFilter({ ...nextFilter, searchQuery: null });
      setScreen("practice");
    });
  }

  function startSearch(query) {
    const variant = screen === "practice" ? "light" : "full";
    triggerFade(variant, () => {
      setFilter({ subject: null, domain: null, skill: null, searchQuery: query });
      setScreen("practice");
    });
  }

  function startTimedTest() {
    const variant = screen === "timed" ? "light" : "full";
    triggerFade(variant, () => setScreen("timed"));
  }

  function returnToMenu() {
    triggerFade("full", () => {
      setScreen("menu");
      setActiveSlug(null);
    });
  }

  function handleBrowseFilter(nextFilter) {
    setBrowseOpen(false);
    startPractice(nextFilter);
  }

  function handleBrowseSearch(query) {
    setBrowseOpen(false);
    startSearch(query);
  }

  const pool = filter.searchQuery ? searchQuestions(filter.searchQuery) : filterQuestions(filter);

  let title = "All Questions";
  let subtitle = "Randomized practice across Reading & Writing and Math";
  if (filter.searchQuery) {
    title = "Search Results";
    subtitle = `"${filter.searchQuery}" · ${pool.length} question${pool.length === 1 ? "" : "s"}`;
  } else if (filter.skill) {
    title = filter.skill;
    subtitle = `${subjectLabel(filter.subject)} · ${filter.domain}`;
  } else if (filter.domain) {
    title = filter.domain;
    subtitle = `${subjectLabel(filter.subject)} · Randomized ${filter.domain} practice`;
  } else if (filter.subject && filter.subject !== "all") {
    title = subjectLabel(filter.subject);
    subtitle = `Randomized ${subjectLabel(filter.subject)} practice`;
  }

  const filterKey = `${filter.subject}|${filter.domain}|${filter.skill}|${filter.searchQuery}`;

  return (
    <div className={`concept-orrery${screen === "concept" ? " view-concept" : " view-menu"}`} lang="en">
      <button
        type="button"
        className="orrery-hud-btn"
        onClick={() => setBrowseOpen((o) => !o)}
        aria-label="Browse and search all questions"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M13.5 13.5 18 18M15.5 9a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Browse
      </button>

      {(screen === "practice" || screen === "timed") && (
        <nav className="orrery-topnav" aria-label="Orrery navigation">
          <button type="button" className="orrery-nav-link" onClick={returnToMenu}>
            &larr; Return to Orrery
          </button>
        </nav>
      )}

      <div className="comet-layer" aria-hidden="true">
        {comets.map((c) => (
          <div
            key={c.id}
            className="comet"
            style={{
              left: c.startX + "px",
              top: c.startY + "px",
              "--dx": c.dx + "px",
              "--dy": c.dy + "px",
              animationDuration: c.duration + "s",
            }}
            onAnimationEnd={() => removeComet(c.id)}
          >
            <div className="comet-rotate" style={{ transform: `rotate(${c.angleDeg}deg)` }}>
              <div className="comet-streak" style={{ width: c.length + "px" }}>
                <span className="comet-head"></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(screen === "menu" || screen === "concept") && (
        <>
          <main className="solar-system">
            <div className="orrery">
              <div className="guide-ring guide-ring-1" aria-hidden="true"></div>
              <div className="guide-ring guide-ring-2" aria-hidden="true"></div>
              <div className="guide-ring guide-ring-3" aria-hidden="true"></div>
              <div className="guide-ring guide-ring-4" aria-hidden="true"></div>
              <div className="guide-ring guide-ring-5" aria-hidden="true"></div>

              <div className="orbit-ring"></div>

              <div className="neutron-ring neutron-ring-far" aria-hidden="true"></div>
              <div className="neutron-ring neutron-ring-outer" aria-hidden="true"></div>
              <div className="neutron-ring neutron-ring-inner" aria-hidden="true"></div>

              <button
                type="button"
                className="neutron-pulse neutron-launch"
                onClick={startTimedTest}
                aria-label="Launch the full Timed Test — a complete SAT simulation"
              >
                <div className="neutron-corona"></div>
                <svg className="neutron-svg" viewBox="0 0 160 160" role="img" aria-label="A neutron star, pulsing">
                  <defs>
                    <radialGradient id="orreryNeutronCore" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="55%" stopColor="#e0f7ff" />
                      <stop offset="100%" stopColor="#8fd9ff" />
                    </radialGradient>
                  </defs>
                  <circle cx="80" cy="80" r="38" fill="url(#orreryNeutronCore)" />
                </svg>
                <span className="neutron-label">
                  <span className="planet-cat">MISSION</span>
                  <span className="planet-name">Timed Test</span>
                </span>
              </button>

              <nav aria-label="SAT concept categories">
                {CONCEPTS.map((c, i) => (
                  <div className="planet-slot" key={c.slug} style={{ "--angle": i * 45 + "deg" }}>
                    <a
                      className="planet"
                      href={`#/concept/${c.slug}`}
                      style={{
                        "--angle": i * 45 + "deg",
                        "--i": i,
                        "--hi": c.hi,
                        "--base": c.base,
                        "--sh": c.sh,
                        "--glow": c.base + "aa",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        openConcept(c.slug);
                      }}
                    >
                      <span className="planet-sphere-wrap" aria-hidden="true">
                        {c.ring && (
                          <span
                            className={`planet-ring${c.ring === "tilted" ? " planet-ring-tilted" : ""}`}
                            style={{ "--ring-color": c.hi + "77" }}
                          ></span>
                        )}
                        <span className={`planet-body planet-surface-${c.surface}`}>
                          {c.surface !== "smooth" && <span className="planet-texture"></span>}
                        </span>
                      </span>
                      <span className="planet-label">
                        <span className="planet-cat">{c.catalog}</span>
                        <span className="planet-name">{c.name}</span>
                      </span>
                    </a>
                  </div>
                ))}
              </nav>
            </div>
          </main>

          <section className="concept-view" aria-live="polite">
            {screen === "concept" && active && (
              <ConceptPanel
                concept={active}
                onBack={closeConcept}
                onStartPractice={(concept) =>
                  startPractice({ subject: concept.subject, domain: concept.domain, skill: null })
                }
                onStartSkill={(concept, skill) =>
                  startPractice({ subject: concept.subject, domain: concept.domain, skill })
                }
              />
            )}
          </section>
        </>
      )}

      {screen === "practice" && (
        <div className="orrery-content">
          <PracticeMode key={filterKey} questionPool={pool} title={title} subtitle={subtitle} />
        </div>
      )}

      {screen === "timed" && (
        <div className="orrery-content">
          <TimedTest />
        </div>
      )}

      {browseOpen && (
        <BrowsePanel
          onClose={() => setBrowseOpen(false)}
          onStartFilter={handleBrowseFilter}
          onStartSearch={handleBrowseSearch}
        />
      )}
    </div>
  );
}

export default ConceptOrrery;
