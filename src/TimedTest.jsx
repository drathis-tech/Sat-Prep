import { useEffect, useRef, useState } from "react";
import { getSubjectPool, isAnswerCorrect, parseChoice, shuffle } from "./quizUtils";
import { renderMath } from "./renderMath";
import Calculator from "./Calculator";
import { useScreenFade } from "./useScreenFade";
import ReferenceSheet from "./ReferenceSheet";
import "./Practice.css";
import "./TimedTest.css";

const MODULES = [
  { id: "rw1", subject: "reading_writing", label: "Reading & Writing — Module 1", minutes: 32, count: 27 },
  { id: "rw2", subject: "reading_writing", label: "Reading & Writing — Module 2", minutes: 32, count: 27 },
  { id: "break", label: "Break", minutes: 10, isBreak: true },
  { id: "math1", subject: "math", label: "Math — Module 1", minutes: 35, count: 22 },
  { id: "math2", subject: "math", label: "Math — Module 2", minutes: 35, count: 22 },
];

const QUESTION_MODULES = MODULES.filter((m) => !m.isBreak);

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function buildModuleQuestions() {
  const rwPool = shuffle(getSubjectPool("reading_writing"));
  const mathPool = shuffle(getSubjectPool("math"));
  return {
    rw1: rwPool.slice(0, 27),
    rw2: rwPool.slice(27, 54),
    math1: mathPool.slice(0, 22),
    math2: mathPool.slice(22, 44),
  };
}

function emptyModuleAnswers() {
  return {
    rw1: Array(27).fill(null),
    rw2: Array(27).fill(null),
    math1: Array(22).fill(null),
    math2: Array(22).fill(null),
  };
}

// Every screen wears the same shell: crumbs on the left, Exit on the right.
function Shell({ crumb, children, right, onExit }) {
  return (
    <div className="pr-screen">
      <div className="pr-head">
        <div className="pr-crumbs">
          <span className="pr-crumb-app">Vega / Full test</span>
          {crumb && <span className="pr-crumb-domain">{crumb}</span>}
        </div>
        <div className="pr-head-right">
          {right}
          {onExit && (
            <button type="button" className="pr-pill" onClick={onExit}>
              Exit
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function TimedTest({ onExit }) {
  const triggerFade = useScreenFade();
  const [phase, setPhase] = useState("intro"); // intro | running | results
  const [stageIndex, setStageIndex] = useState(0);
  const [moduleData, setModuleData] = useState(null);
  const [moduleAnswers, setModuleAnswers] = useState(null);
  const [elapsedByModule, setElapsedByModule] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [freeResponse, setFreeResponse] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const bodyRef = useRef(null);
  // triggerFade defers its callback, so a second Next landing before the
  // first one runs would advance twice off one question — past the end of
  // the module, in the worst case. One advance in flight at a time.
  const advancingRef = useRef(false);

  const stage = MODULES[stageIndex];

  function startTest() {
    triggerFade("full", () => {
      setModuleData(buildModuleQuestions());
      setModuleAnswers(emptyModuleAnswers());
      setElapsedByModule({});
      setStageIndex(0);
      setQuestionIndex(0);
      setSelected(null);
      setFreeResponse("");
      setSecondsRemaining(MODULES[0].minutes * 60);
      setIsPaused(false);
      setPhase("running");
    });
  }

  function goToNextStage() {
    advancingRef.current = false;
    const nextIndex = stageIndex + 1;
    if (nextIndex >= MODULES.length) {
      setPhase("results");
      return;
    }
    const next = MODULES[nextIndex];
    setStageIndex(nextIndex);
    setSecondsRemaining(next.minutes * 60);
    setQuestionIndex(0);
    setSelected(null);
    setFreeResponse("");
    setIsPaused(false);
  }

  function finalizeModule(usedSeconds) {
    setElapsedByModule((prev) => ({ ...prev, [stage.id]: usedSeconds }));
    goToNextStage();
  }

  function handleTimeExpired() {
    triggerFade("full", () => {
      if (stage.isBreak) {
        goToNextStage();
      } else {
        finalizeModule(stage.minutes * 60);
      }
    });
  }

  // Countdown: re-armed every render while running & not paused, so it
  // always sees the latest stage/question state (no stale closures). The
  // expiry transition happens inside the timeout callback (not synchronously
  // in the effect body) so it's a reaction to the timer firing, not a render.
  useEffect(() => {
    if (phase !== "running" || isPaused) return undefined;
    const timeout = setTimeout(() => {
      if (secondsRemaining <= 1) {
        handleTimeExpired();
      } else {
        setSecondsRemaining((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused, secondsRemaining, stageIndex]);

  function recordCurrentAnswer() {
    const q = moduleData[stage.id][questionIndex];
    const given = q.type === "multiple_choice" ? selected : freeResponse.trim() || null;
    setModuleAnswers((prev) => {
      const updated = { ...prev, [stage.id]: [...prev[stage.id]] };
      updated[stage.id][questionIndex] = {
        answer: given,
        correct: given ? isAnswerCorrect(q, given) : false,
      };
      return updated;
    });
  }

  function handleSelectChoice(letter) {
    setSelected(letter);
  }

  function handleNext() {
    if (advancingRef.current) return;
    advancingRef.current = true;
    recordCurrentAnswer();
    const isLastQuestion = questionIndex >= stage.count - 1;
    // Finishing a module is a real context change (new section, new timer)
    // and gets the full fade; advancing within a module happens far more
    // often in one sitting, so it stays light.
    triggerFade(isLastQuestion ? "full" : "light", () => {
      if (isLastQuestion) {
        finalizeModule(stage.minutes * 60 - secondsRemaining);
      } else {
        setQuestionIndex((i) => i + 1);
        setSelected(null);
        setFreeResponse("");
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
      }
      advancingRef.current = false;
    });
  }

  function handleFreeResponseKeyDown(e) {
    if (e.key === "Enter") handleNext();
  }

  function togglePause() {
    setIsPaused((p) => !p);
  }

  function skipBreak() {
    triggerFade("full", goToNextStage);
  }

  const isMath = phase === "running" && !stage.isBreak && stage.subject === "math";
  const showCalculator = isMath && !isPaused;

  if (phase === "intro") {
    return (
      <Shell onExit={onExit}>
        <div className="tt-pane">
          <div className="tt-pane-inner">
            <h1 className="tt-title">Full simulation</h1>
            <p className="tt-lede">
              The real digital SAT&apos;s structure and timing: two Reading &amp; Writing modules,
              a break, then two Math modules. Once you move on from a question you can&apos;t go
              back to it. You can pause at any time to step away without losing time.
            </p>
            <ul className="tt-modules">
              {MODULES.map((m) => (
                <li className="tt-module" key={m.id} data-break={m.isBreak ? "" : undefined}>
                  <span>{m.isBreak ? "Break" : m.label}</span>
                  <span className="tt-module-meta">
                    {m.minutes} min{m.isBreak ? "" : ` · ${m.count} questions`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="tt-actions">
              <button type="button" className="pr-btn-primary" onClick={startTest}>
                Start the test
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "results") {
    const moduleResults = QUESTION_MODULES.map((m) => {
      const answers = moduleAnswers[m.id] || [];
      return { ...m, correct: answers.filter((a) => a && a.correct).length, total: m.count };
    });
    const overallCorrect = moduleResults.reduce((sum, m) => sum + m.correct, 0);
    const overallTotal = moduleResults.reduce((sum, m) => sum + m.total, 0);
    const totalSeconds = moduleResults.reduce((sum, m) => sum + (elapsedByModule[m.id] || 0), 0);
    const pct = overallTotal ? Math.round((overallCorrect / overallTotal) * 100) : 0;

    return (
      <Shell crumb="Debrief" onExit={onExit}>
        <div className="tt-pane">
          <div className="tt-pane-inner">
            <div className="tt-score">
              <span className="tt-score-pct">{pct}%</span>
              <span className="tt-score-tally">
                {overallCorrect} of {overallTotal} correct
              </span>
            </div>

            <div className="tt-rows">
              {moduleResults.map((m, i) => (
                <div className="tt-row" key={m.id}>
                  <div className="tt-row-head">
                    <span className="tt-row-label">{m.label}</span>
                    <span className="tt-row-meta">
                      <span>
                        {m.correct} / {m.total}
                      </span>
                      <span className="tt-row-time">
                        {formatDuration(elapsedByModule[m.id] || 0)}
                      </span>
                    </span>
                  </div>
                  <div className="tt-row-track">
                    <div
                      className="tt-row-bar"
                      data-band={
                        m.correct === m.total ? "all" : m.correct === 0 ? "none" : "some"
                      }
                      style={{ "--score": m.correct / m.total, "--delay": `${140 + i * 55}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="tt-totals">
              <div className="tt-total">
                <span className="tt-total-label">Total time used</span>
                <span className="tt-total-value">{formatDuration(totalSeconds)}</span>
              </div>
              <div className="tt-total">
                <span className="tt-total-label">Questions answered</span>
                <span className="tt-total-value">
                  {QUESTION_MODULES.reduce(
                    (n, m) => n + (moduleAnswers[m.id] || []).filter((a) => a && a.answer).length,
                    0,
                  )}{" "}
                  / {overallTotal}
                </span>
              </div>
            </div>

            <div className="tt-actions">
              <button
                type="button"
                className="pr-btn-primary"
                onClick={() => triggerFade("full", () => setPhase("intro"))}
              >
                Run it again
              </button>
              {onExit && (
                <button type="button" className="pr-btn-ghost" onClick={onExit}>
                  Back to Vega
                </button>
              )}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (stage.isBreak) {
    return (
      <Shell crumb="Break" onExit={onExit}>
        <div className="tt-pane">
          <div className="tt-pane-inner">
            <span className="pr-label">Reading &amp; Writing done — Math next</span>
            <div className="tt-bigclock">{formatClock(secondsRemaining)}</div>
            <p className="tt-lede">
              Step away if you want. The break ends on its own, or you can start Math now.
            </p>
            <div className="tt-actions">
              <button type="button" className="pr-btn-primary" onClick={skipBreak}>
                Skip the break
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (isPaused) {
    return (
      <Shell crumb={stage.label} onExit={onExit}>
        <div className="tt-pane">
          <div className="tt-pane-inner">
            <span className="pr-label">Timer paused</span>
            <div className="tt-bigclock">{formatClock(secondsRemaining)}</div>
            <p className="tt-lede">
              The clock is stopped and the question is hidden. Resume when you&apos;re ready.
            </p>
            <div className="tt-actions">
              <button type="button" className="pr-btn-primary" onClick={togglePause}>
                Resume
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const currentQuestion = moduleData[stage.id][questionIndex];
  if (!currentQuestion) return null;
  const lowTime = secondsRemaining <= 300;
  const progress = stage.count ? questionIndex / stage.count : 0;

  return (
    <>
      <Shell
        crumb={stage.label}
        onExit={onExit}
        right={
          <>
            <span className="tt-clock" data-low={lowTime ? "" : undefined} aria-live="off">
              {formatClock(secondsRemaining)}
            </span>
            <button type="button" className="pr-pill" onClick={togglePause}>
              Pause
            </button>
          </>
        }
      >
        <div className="pr-progress">
          <div className="pr-progress-bar" style={{ "--progress": progress }} />
        </div>

        <div className="pr-body" ref={bodyRef}>
          <div className="pr-cols">
            {currentQuestion.passage && (
              <div className="pr-passage">
                <span className="pr-label">Passage</span>
                <div className="pr-passage-text">{renderMath(currentQuestion.passage)}</div>
              </div>
            )}

            <div className="pr-main">
              <span className="pr-label">
                Question {questionIndex + 1} of {stage.count}
              </span>

              <p className="pr-question">{renderMath(currentQuestion.text)}</p>

              {currentQuestion.image && (
                <div className="pr-figure">
                  <img
                    src={`/question-images/${currentQuestion.image}`}
                    alt="Figure for this question"
                  />
                </div>
              )}

              {currentQuestion.type === "multiple_choice" ? (
                <div className="pr-choices">
                  {currentQuestion.choices.map((choice, ci) => {
                    const { letter, body } = parseChoice(choice, ci);
                    const picked = selected === letter;
                    return (
                      <button
                        type="button"
                        key={letter}
                        className="pr-choice"
                        data-state={picked ? "selected" : "idle"}
                        aria-pressed={picked}
                        onClick={() => handleSelectChoice(letter)}
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
                    placeholder="Type your answer"
                    value={freeResponse}
                    onChange={(e) => setFreeResponse(e.target.value)}
                    onKeyDown={handleFreeResponseKeyDown}
                    aria-label="Your answer"
                  />
                  <span className="pr-fr-hint">
                    Student-produced response — enter a number or short phrase
                  </span>
                </div>
              )}
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
            <span className="tt-warning">No going back once you continue</span>
          </div>

          <div className="pr-foot-group">
            <button type="button" className="pr-btn-primary" onClick={handleNext}>
              {questionIndex >= stage.count - 1 ? "Finish module" : "Next question"}
            </button>
          </div>
        </div>

        {refOpen && <ReferenceSheet onClose={() => setRefOpen(false)} />}
      </Shell>

      <Calculator show={showCalculator} open={calcOpen} onOpenChange={setCalcOpen} />
    </>
  );
}

export default TimedTest;
