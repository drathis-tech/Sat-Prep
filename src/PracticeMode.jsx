import { useMemo, useRef, useState } from "react";
import { isAnswerCorrect, shuffle } from "./quizUtils";
import { renderMath } from "./renderMath";
import Calculator from "./Calculator";
import { useScreenFade } from "./useScreenFade";
import "./Practice.css";

// A set is capped so it ends somewhere and can be scored; the results screen
// is the point of the cap.
const SET_SIZE = 30;

const LETTERS = ["A", "B", "C", "D"];

// The formula sheet the digital SAT provides on both Math modules.
const REFERENCE = [
  { group: "Circle", items: ["$A = \\pi r^2$", "$C = 2\\pi r$"] },
  { group: "Rectangle", items: ["$A = \\ell w$", "$V = \\ell w h$"] },
  { group: "Triangle", items: ["$A = \\tfrac{1}{2} b h$", "$c^2 = a^2 + b^2$"] },
  {
    group: "Special right triangles",
    items: [
      "$30\\degree\\text{-}60\\degree\\text{-}90\\degree:\\ x,\\ x\\sqrt{3},\\ 2x$",
      "$45\\degree\\text{-}45\\degree\\text{-}90\\degree:\\ s,\\ s,\\ s\\sqrt{2}$",
    ],
  },
  { group: "Cylinder / Sphere", items: ["$V = \\pi r^2 h$", "$V = \\tfrac{4}{3}\\pi r^3$"] },
  { group: "Cone / Pyramid", items: ["$V = \\tfrac{1}{3}\\pi r^2 h$", "$V = \\tfrac{1}{3} \\ell w h$"] },
  {
    group: "Facts",
    items: ["Arc of a circle: $360\\degree = 2\\pi$ radians", "Angles of a triangle sum to $180\\degree$"],
  },
];

function ReferenceSheet({ onClose }) {
  return (
    <div className="pr-refsheet" role="dialog" aria-label="Reference sheet">
      <div className="pr-panel-head">
        <span className="pr-panel-title">Reference sheet</span>
        <button type="button" className="pr-panel-close" onClick={onClose} aria-label="Close reference sheet">
          ×
        </button>
      </div>
      {REFERENCE.map((g) => (
        <div className="pr-ref-group" key={g.group}>
          <span className="pr-ref-group-name">{g.group}</span>
          <div className="pr-ref-items">
            {g.items.map((item) => (
              <span key={item}>{renderMath(item)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Per-skill tally for the set, weakest first — that ordering is the point:
// the first row is what to work on next.
function Results({ log, domainLabel, onRetry, onExit }) {
  const right = log.filter((entry) => entry.correct).length;
  const pct = log.length ? Math.round((right / log.length) * 100) : 0;

  const rows = useMemo(() => {
    const bySkill = new Map();
    for (const entry of log) {
      const skill = entry.question.skill;
      if (!bySkill.has(skill)) bySkill.set(skill, { skill, right: 0, total: 0 });
      const row = bySkill.get(skill);
      row.total += 1;
      if (entry.correct) row.right += 1;
    }
    return [...bySkill.values()].sort((a, b) => a.right / a.total - b.right / b.total);
  }, [log]);

  return (
    <div className="pr-results">
      <div className="pr-results-inner">
        <div className="pr-results-head">
          <span className="pr-results-eyebrow">Set complete · {domainLabel}</span>
          <div className="pr-results-scoreline">
            <span className="pr-results-pct">{pct}%</span>
            <span className="pr-results-tally">
              {right} of {log.length} correct
            </span>
          </div>
        </div>

        <div className="pr-breakdown">
          <span className="pr-results-eyebrow">Weakest skills first</span>
          <div className="pr-rows">
            {rows.map((row, i) => (
              <div className="pr-row" key={row.skill}>
                <div className="pr-row-head">
                  <span className="pr-row-skill">{row.skill}</span>
                  <span className="pr-row-tally">
                    {row.right} / {row.total}
                  </span>
                </div>
                <div className="pr-row-track">
                  <div
                    className="pr-row-bar"
                    data-band={row.right === row.total ? "all" : row.right === 0 ? "none" : "some"}
                    style={{ "--score": row.right / row.total, "--delay": `${140 + i * 55}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pr-results-actions">
          <button type="button" className="pr-btn-primary" onClick={onRetry}>
            Run the set again
          </button>
          <button type="button" className="pr-btn-ghost" onClick={onExit}>
            Back to Vega
          </button>
        </div>
      </div>
    </div>
  );
}

function PracticeMode({ questionPool, title, onExit }) {
  const triggerFade = useScreenFade();
  const [setId, setSetId] = useState(0);
  const [order, setOrder] = useState(() => shuffle(questionPool).slice(0, SET_SIZE));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [freeResponse, setFreeResponse] = useState("");
  const [answered, setAnswered] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const bodyRef = useRef(null);

  // A long question leaves the pane scrolled; without this the next one
  // opens partway down, below its own text.
  function resetScroll() {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }

  const current = order[index];
  const rightSoFar = log.filter((entry) => entry.correct).length;
  const isMC = current && current.type === "multiple_choice";
  const given = isMC ? selected : freeResponse.trim();
  const lastEntry = log.length ? log[log.length - 1] : null;
  const wasCorrect = answered && lastEntry ? lastEntry.correct : false;

  function checkAnswer() {
    if (answered || !given) return;
    const correct = isAnswerCorrect(current, given);
    setAnswered(true);
    setLog((entries) => [...entries, { question: current, given, correct }]);
  }

  function nextQuestion() {
    if (index + 1 >= order.length) {
      triggerFade("full", () => setDone(true));
      return;
    }
    triggerFade("light", () => {
      setIndex((i) => i + 1);
      setSelected(null);
      setFreeResponse("");
      setAnswered(false);
      resetScroll();
    });
  }

  function retry() {
    triggerFade("full", () => {
      setOrder(shuffle(questionPool).slice(0, SET_SIZE));
      setSetId((n) => n + 1);
      setIndex(0);
      setSelected(null);
      setFreeResponse("");
      setAnswered(false);
      setLog([]);
      setDone(false);
      resetScroll();
    });
  }

  const domainLabel = current ? current.domain : title;

  if (done) {
    return (
      <Results
        key={setId}
        log={log}
        domainLabel={title || domainLabel}
        onRetry={retry}
        onExit={onExit}
      />
    );
  }

  if (!current) return null;

  const isMath = current.subject === "math";
  const progress = order.length ? (index + (answered ? 1 : 0)) / order.length : 0;

  return (
    <div className="pr-screen">
      <div className="pr-head">
        <div className="pr-crumbs">
          <span className="pr-crumb-app">Vega / Practice</span>
          <span className="pr-crumb-domain">{current.domain}</span>
          <span className="pr-crumb-skill">{current.skill}</span>
        </div>
        <div className="pr-head-right">
          <span className="pr-score">
            {rightSoFar} / {log.length}
          </span>
          <button type="button" className="pr-pill" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>

      <div className="pr-progress">
        <div className="pr-progress-bar" style={{ "--progress": progress }} />
      </div>

      <div className="pr-body" ref={bodyRef}>
        <div className="pr-cols">
          {current.passage && (
            <div className="pr-passage">
              <span className="pr-label">Passage</span>
              <div className="pr-passage-text">{renderMath(current.passage)}</div>
            </div>
          )}

          <div className="pr-main">
            <span className="pr-label">
              Question {index + 1} of {order.length}
            </span>

            <p className="pr-question">{renderMath(current.text)}</p>

            {current.image && (
              <div className="pr-figure">
                <img src={`/question-images/${current.image}`} alt="Figure for this question" />
              </div>
            )}

            {isMC ? (
              <div className="pr-choices">
                {current.choices.map((choice, ci) => {
                  // Choices normally read "A. ...", but a couple in the bank
                  // are missing their prefix — fall back to position so the
                  // badge and the answer key stay in step either way.
                  const prefix = /^([A-D])[.)]\s*/.exec(choice.trim());
                  const letter = prefix ? prefix[1] : LETTERS[ci];
                  const body = prefix ? choice.trim().slice(prefix[0].length) : choice;
                  const isKey = letter === current.correctAnswer;
                  const picked = selected === letter;
                  let state = "idle";
                  if (answered && isKey) state = "key";
                  else if (answered && picked) state = "wrong";
                  else if (picked) state = "selected";
                  return (
                    <button
                      type="button"
                      key={letter}
                      className="pr-choice"
                      data-state={state}
                      disabled={answered}
                      aria-pressed={picked}
                      onClick={() => setSelected(letter)}
                    >
                      <span className="pr-badge">{letter}</span>
                      <span className="pr-choice-body">{renderMath(body)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pr-fr">
                <input
                  type="text"
                  value={freeResponse}
                  onChange={(e) => setFreeResponse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") checkAnswer();
                  }}
                  disabled={answered}
                  placeholder="Type your answer"
                  aria-label="Your answer"
                />
                <span className="pr-fr-hint">
                  Student-produced response — enter a number or short phrase
                </span>
              </div>
            )}

            <div
              className="pr-feedback"
              data-shown={answered ? "" : undefined}
              data-correct={wasCorrect ? "" : undefined}
              aria-live="polite"
            >
              <div className="pr-verdict-row">
                <span className="pr-verdict">{wasCorrect ? "Correct" : "Not quite"}</span>
                <span className="pr-keyline">
                  {wasCorrect ? "You got it." : `Correct answer: ${current.correctAnswer}`}
                </span>
              </div>
              <p className="pr-explain">{renderMath(current.explanation)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pr-foot">
        <div className="pr-foot-group">
          {isMath && (
            <>
              <button
                type="button"
                className="pr-pill"
                aria-pressed={calcOpen}
                onClick={() => setCalcOpen((o) => !o)}
              >
                Calculator
              </button>
              <button
                type="button"
                className="pr-pill"
                aria-pressed={refOpen}
                onClick={() => setRefOpen((o) => !o)}
              >
                Reference
              </button>
            </>
          )}
        </div>

        <div className="pr-foot-group">
          {answered ? (
            <button type="button" className="pr-btn-primary" onClick={nextQuestion}>
              {index + 1 >= order.length ? "See results" : "Next question"}
            </button>
          ) : (
            <button type="button" className="pr-btn-primary" onClick={checkAnswer} disabled={!given}>
              Check answer
            </button>
          )}
        </div>
      </div>

      {refOpen && <ReferenceSheet onClose={() => setRefOpen(false)} />}

      {/* Desmos, kept mounted for the whole set so work survives the next
          question; the footer pill drives it. */}
      <Calculator show={isMath} open={calcOpen} onOpenChange={setCalcOpen} />
    </div>
  );
}

export default PracticeMode;
