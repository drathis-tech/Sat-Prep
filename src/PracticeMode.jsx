import { useMemo, useRef, useState } from "react";
import { parseChoice } from "./quizUtils";
import { renderMath } from "./renderMath";
import Calculator from "./Calculator";
import ReferenceSheet from "./ReferenceSheet";
import { useScreenFade } from "./useScreenFade";
import { orderForStudent, submitAnswer } from "./student";
import ScoreReadout from "./ScoreReadout";
import "./Practice.css";

// A set is capped so it ends somewhere and can be scored; the results screen
// is the point of the cap.
const SET_SIZE = 30;

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

        <div className="cm-results-score">
          <span className="pr-results-eyebrow">Your lifetime score</span>
          <ScoreReadout />
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
  const [order, setOrder] = useState(() => orderForStudent(questionPool).slice(0, SET_SIZE));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [freeResponse, setFreeResponse] = useState("");
  const [answered, setAnswered] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const bodyRef = useRef(null);
  // See TimedTest: the fade defers, so without a latch two fast clicks
  // advance twice off one question.
  const advancingRef = useRef(false);

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

  // The server checks the answer and returns the verdict along with the
  // key and explanation — none of which the browser has until now.
  async function checkAnswer() {
    if (answered || checking || !given) return;
    setChecking(true);
    setError(null);
    try {
      const result = await submitAnswer(current, given);
      setLog((entries) => [
        ...entries,
        {
          question: current,
          given,
          correct: result.correct,
          correctAnswer: result.correctAnswer,
          explanation: result.explanation,
          counted: result.counted,
        },
      ]);
      setAnswered(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  function nextQuestion() {
    if (advancingRef.current) return;
    advancingRef.current = true;
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
      advancingRef.current = false;
    });
  }

  function retry() {
    triggerFade("full", () => {
      setOrder(orderForStudent(questionPool).slice(0, SET_SIZE));
      setSetId((n) => n + 1);
      setError(null);
      setIndex(0);
      setSelected(null);
      setFreeResponse("");
      setAnswered(false);
      setLog([]);
      setDone(false);
      resetScroll();
      advancingRef.current = false;
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
          <ScoreReadout />
          <span className="pr-score" title="This set">
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
                  const { letter, body } = parseChoice(choice, ci);
                  const isKey = answered && letter === lastEntry.correctAnswer;
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
                      disabled={answered || checking}
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
                  disabled={answered || checking}
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
                  {wasCorrect ? "You got it." : `Correct answer: ${answered ? lastEntry.correctAnswer : ""}`}
                </span>
              </div>
              {answered && !lastEntry.counted && (
                <p className="cm-practice-only">
                  Practice only — you answered this one recently, so it didn&apos;t change your
                  score.
                </p>
              )}
              <p className="pr-explain">{answered ? renderMath(lastEntry.explanation) : null}</p>
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
          {error && (
            <span className="cm-error" role="alert">
              {error}
            </span>
          )}
          {answered ? (
            <button type="button" className="pr-btn-primary" onClick={nextQuestion}>
              {index + 1 >= order.length ? "See results" : "Next question"}
            </button>
          ) : (
            <button
              type="button"
              className="pr-btn-primary"
              onClick={checkAnswer}
              disabled={!given || checking}
            >
              {checking ? "Checking…" : "Check answer"}
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
