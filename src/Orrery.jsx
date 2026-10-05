import { useCallback, useEffect, useRef, useState } from "react";
import { questions } from "./questionBank";
import { domainGroups } from "./quizUtils";
import { computeScore, formatAccuracy } from "../shared/scoring";
import { useStudent } from "./student";
import ScoreReadout from "./ScoreReadout";
import "./Orrery.css";

const STAGES = [
  {
    img: "/landing/stage-0.png",
    mask: "wide",
    filter: "brightness(1.02) saturate(1.02)",
    title: "Vega core",
    blurb: "Every domain orbits one score. Start here.",
    cta: "Start a full test",
    entry: { type: "timed" },
  },
  {
    img: "/landing/stage-1.png",
    mask: "tight",
    filter: "contrast(1.16) brightness(1.02) saturate(1.04)",
    left: "-3vh",
    title: "Information and ideas",
    blurb: "Central ideas, detail, inference, command of evidence.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "reading_writing", domain: "Information and Ideas" },
  },
  {
    img: "/landing/stage-2.png",
    mask: "wide",
    filter: "brightness(1.06) saturate(1.04)",
    title: "Craft and structure",
    blurb: "Vocabulary in context, text structure, purpose, cross-text connections.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "reading_writing", domain: "Craft and Structure" },
  },
  {
    img: "/landing/stage-3.png",
    mask: "tight",
    filter: "contrast(1.14) brightness(1.24) saturate(1.06)",
    title: "Standard English conventions",
    blurb: "Sentence boundaries, agreement, punctuation, verb form.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "reading_writing", domain: "Standard English Conventions" },
  },
  {
    img: "/landing/stage-4.png",
    mask: "tight",
    filter: "contrast(1.16) brightness(1.02) saturate(1.04)",
    title: "Expression of ideas",
    blurb: "Rhetorical synthesis and transitions.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "reading_writing", domain: "Expression of Ideas" },
  },
  {
    img: "/landing/stage-5.png",
    mask: "wide",
    filter: "brightness(1.06) saturate(1.04)",
    title: "Algebra",
    blurb: "Linear equations, systems, inequalities.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "math", domain: "Algebra" },
  },
  {
    img: "/landing/stage-6.png",
    mask: "wide",
    filter: "brightness(1.06) saturate(1.04)",
    title: "Advanced math",
    blurb: "Quadratics, exponentials, nonlinear systems.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "math", domain: "Advanced Math" },
  },
  {
    img: "/landing/stage-7.png",
    mask: "tight",
    filter: "contrast(1.18) brightness(1.02) saturate(1.04)",
    title: "Problem solving and data analysis",
    blurb: "Ratios, percentages, models, probability, statistics.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "math", domain: "Problem-Solving and Data Analysis" },
  },
  {
    img: "/landing/stage-8.png",
    mask: "wide",
    filter: "brightness(1.06) saturate(1.04)",
    title: "Geometry and trigonometry",
    blurb: "Angles, circles, right triangles, area and volume.",
    cta: "Start these questions",
    entry: { type: "domain", subject: "math", domain: "Geometry and Trigonometry" },
  },
];

const LAST_STAGE = STAGES.length - 1;

export { STAGES };

// What the signed-in student has done on a stage: their overall score on the
// core, their record in that domain on a planet.
function stageStat(entry, totals, domains) {
  if (entry.type === "timed") {
    return totals.answered > 0
      ? `Your score ${computeScore(totals)} · ${formatAccuracy(totals)} accuracy`
      : "No answers yet — your score starts here";
  }
  const record = domains[entry.domain];
  if (!record || record.attempted === 0) return "Not started yet";
  return `${record.attempted} answered · ${formatAccuracy({
    answered: record.attempted,
    correct: record.correct,
  })} correct`;
}

function Orrery({ onClose, onEnter, onBrowse, onMission, paused }) {
  const { totals, domains } = useStudent();
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);
  const accumRef = useRef(0);
  const lastStepRef = useRef(0);

  // The wheel/key handlers are bound once and read the level through a ref,
  // so the rate limit isn't reset by a re-render mid-gesture.
  const step = useCallback((dir, cooldown) => {
    const now = performance.now();
    if (now - lastStepRef.current < cooldown) return;
    const next = Math.min(LAST_STAGE, Math.max(0, levelRef.current + dir));
    if (next === levelRef.current) return;
    levelRef.current = next;
    lastStepRef.current = now;
    setLevel(next);
  }, []);

  // While Browse or Mission Control is open over the orrery, the wheel and
  // keys belong to that panel.
  useEffect(() => {
    if (paused) return undefined;

    function onWheel(e) {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (performance.now() - lastStepRef.current < 620) return;
      accumRef.current += d;
      if (Math.abs(accumRef.current) < 110) return;
      const dir = accumRef.current > 0 ? 1 : -1;
      accumRef.current = 0;
      step(dir, 620);
    }

    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!map[e.key]) return;
      e.preventDefault();
      step(map[e.key], 320);
    }

    // Touch devices never fire `wheel`, so a swipe is the only way to
    // advance there. Tracked on the overlay itself rather than the window so
    // a tap on a button still behaves normally.
    let touchX = 0;
    let touchY = 0;
    let touching = false;

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      touching = true;
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }

    function onTouchEnd(e) {
      if (!touching) return;
      touching = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) < 48) return;
      step(d < 0 ? 1 : -1, 320);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [step, onClose, paused]);

  const goTo = useCallback((i) => {
    levelRef.current = i;
    lastStepRef.current = performance.now();
    setLevel(i);
  }, []);

  return (
    <div className="vg-orrery" role="dialog" aria-modal="true" aria-label="Domain orrery">
      <div className="vg-orrery-bar">
        <span className="vg-orrery-crumb">Vega / Orrery</span>
        <div className="vg-orrery-actions">
          <ScoreReadout />
          {onMission && (
            <button type="button" className="vg-pill" onClick={onMission}>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="vg-pill-icon">
                <path
                  d="M3 17v-6M8 17V4M13 17V8M18 17v-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Mission Control
            </button>
          )}
          {onBrowse && (
            <button type="button" className="vg-pill" onClick={onBrowse}>
              <svg viewBox="0 0 20 20" aria-hidden="true" className="vg-pill-icon">
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
          )}
          <button type="button" className="vg-pill" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="vg-orrery-stars" aria-hidden="true"></div>

      <div className="vg-orrery-stagelayer" aria-hidden="true">
        {STAGES.map((s, i) => {
          const on = i === level;
          const past = i < level;
          return (
            <div
              key={s.title}
              className={`vg-stage vg-stage-mask-${s.mask}`}
              style={{
                left: s.left ?? 0,
                "--stage-filter": s.filter,
                opacity: on ? 1 : 0,
                transform: on
                  ? "translate(0, -50%)"
                  : `translate(0, calc(-50% ${past ? "-" : "+"} 16vh))`,
                willChange: on || Math.abs(i - level) === 1 ? "transform, opacity" : "auto",
              }}
            >
              <img src={s.img} alt="" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </div>
          );
        })}
      </div>

      <div className="vg-orrery-panels">
        {STAGES.map((s, i) => {
          const on = i === level;
          return (
            <div
              key={s.title}
              className="vg-panel"
              aria-hidden={!on}
              style={{
                opacity: on ? 1 : 0,
                transform: `translateY(${on ? "-50%" : i < level ? "-66%" : "-34%"})`,
                // the copy follows the planet rather than moving with it
                transitionDelay: on ? "120ms" : "0ms",
                pointerEvents: on ? "auto" : "none",
              }}
            >
              <span className="vg-panel-index">
                {String(i).padStart(2, "0")} / {String(LAST_STAGE).padStart(2, "0")}
              </span>
              <h3>{s.title}</h3>
              <p>{s.blurb}</p>
              <span className="cm-panel-stat">{stageStat(s.entry, totals, domains)}</span>
              <button
                type="button"
                className="vg-panel-btn"
                tabIndex={on ? 0 : -1}
                onClick={() => onEnter(s.entry)}
              >
                <span className="vg-pill-dot"></span>
                {s.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="vg-ticks">
        {STAGES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className="vg-tick"
            data-active={i === level ? "" : undefined}
            aria-current={i === level}
            onClick={() => goTo(i)}
          >
            <span className="vg-tick-dot"></span>
            <span className="vg-tick-label">{s.title}</span>
          </button>
        ))}
      </div>

      <div className="vg-orrery-foot">
        <span className="vg-orrery-hint">
          <span className="vg-hint-pointer">Scroll to advance</span>
          <span className="vg-hint-touch">Swipe to advance</span>
        </span>
        <span>
          {domainGroups.length} domains / {questions.length.toLocaleString()} questions
        </span>
      </div>
    </div>
  );
}

export default Orrery;
