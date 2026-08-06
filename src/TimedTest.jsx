import { useEffect, useState } from "react";
import { getSubjectPool, isAnswerCorrect, shuffle } from "./quizUtils";
import { renderMath } from "./renderMath";
import Calculator from "./Calculator";

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

function TimedTest() {
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

  const stage = MODULES[stageIndex];

  function startTest() {
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
  }

  function goToNextStage() {
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
    if (stage.isBreak) {
      goToNextStage();
    } else {
      finalizeModule(stage.minutes * 60);
    }
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
    recordCurrentAnswer();
    const isLastQuestion = questionIndex >= stage.count - 1;
    if (isLastQuestion) {
      finalizeModule(stage.minutes * 60 - secondsRemaining);
    } else {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setFreeResponse("");
    }
  }

  function handleFreeResponseKeyDown(e) {
    if (e.key === "Enter") handleNext();
  }

  function togglePause() {
    setIsPaused((p) => !p);
  }

  function skipBreak() {
    goToNextStage();
  }

  const showCalculator =
    phase === "running" && !stage.isBreak && !isPaused && stage.subject === "math";

  let body;

  if (phase === "intro") {
    body = (
      <>
        <header className="content-header">
          <div>
            <h1 className="content-title">Timed Test</h1>
            <p className="content-subtitle">Full digital SAT structure and timing</p>
          </div>
        </header>

        <div className="question-card panel-narrow">
          <h2>Before you begin</h2>
          <p>
            This simulates the real digital SAT: two Reading &amp; Writing modules, a break, then
            two Math modules. Once you submit an answer and move on, you can&apos;t go back to
            change it. You can pause at any time to step away without losing time.
          </p>
          <ul className="intro-modules">
            {MODULES.map((m) => (
              <li key={m.id} className={m.isBreak ? "is-break" : ""}>
                <span>{m.isBreak ? "Break" : m.label}</span>
                <span>
                  {m.minutes} min{!m.isBreak ? ` · ${m.count} questions` : ""}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="primary-btn" onClick={startTest}>
            Begin Test
          </button>
        </div>
      </>
    );
  } else if (phase === "results") {
    const moduleResults = QUESTION_MODULES.map((m) => {
      const answers = moduleAnswers[m.id] || [];
      const correct = answers.filter((a) => a && a.correct).length;
      return { ...m, correct, total: m.count };
    });
    const overallCorrect = moduleResults.reduce((sum, m) => sum + m.correct, 0);
    const overallTotal = moduleResults.reduce((sum, m) => sum + m.total, 0);
    const totalSeconds = moduleResults.reduce(
      (sum, m) => sum + (elapsedByModule[m.id] || 0),
      0
    );

    body = (
      <>
        <header className="content-header">
          <div>
            <h1 className="content-title">Test Results</h1>
            <p className="content-subtitle">Here's how you did</p>
          </div>
        </header>

        <div className="question-card panel-narrow">
          <h2>Score Summary</h2>
          <ul className="results-modules">
            {moduleResults.map((m) => (
              <li key={m.id}>
                <span>{m.label}</span>
                <span>
                  {m.correct}/{m.total}
                </span>
              </li>
            ))}
          </ul>
          <div className="results-summary">
            <div className="results-summary-row">
              <span>Overall Score</span>
              <span className="value">
                {overallCorrect}/{overallTotal}
              </span>
            </div>
            <div className="results-summary-row">
              <span>Total Time Used</span>
              <span className="value">{formatDuration(totalSeconds)}</span>
            </div>
          </div>
          <button type="button" className="primary-btn" onClick={() => setPhase("intro")}>
            Retake Test
          </button>
        </div>
      </>
    );
  } else if (stage.isBreak) {
    // phase === "running"
    body = (
      <>
        <header className="content-header">
          <div>
            <h1 className="content-title">Break</h1>
            <p className="content-subtitle">Reading &amp; Writing is done — Math is next</p>
          </div>
        </header>

        <div className="question-card panel-narrow panel-center">
          <h2>Take a breather</h2>
          <div className="break-timer">{formatClock(secondsRemaining)}</div>
          <p>You can wait for the break to end, or skip it and start Math right away.</p>
          <button type="button" className="primary-btn" onClick={skipBreak}>
            Skip Break
          </button>
        </div>
      </>
    );
  } else if (isPaused) {
    body = (
      <>
        <header className="content-header">
          <div>
            <h1 className="content-title">{stage.label}</h1>
            <p className="content-subtitle">Timer paused</p>
          </div>
        </header>

        <div className="question-card panel-narrow panel-center">
          <h2>Test Paused</h2>
          <p>Your timer is stopped and the question is hidden. Resume when you're ready.</p>
          <button type="button" className="primary-btn" onClick={togglePause}>
            Resume
          </button>
        </div>
      </>
    );
  } else {
    const currentQuestion = moduleData[stage.id][questionIndex];
    const lowTime = secondsRemaining <= 300;

    body = (
      <>
        <div className="page-topbar">
          <span className="page-topbar-label">{stage.label} · No going back once you hit Next</span>
        </div>

        <main className="question-card">
          <div className="timed-header">
            <span className="timed-progress">
              Question {questionIndex + 1} of {stage.count}
            </span>
            <div className="timer-controls">
              <span className={`timer-badge${lowTime ? " low-time" : ""}`}>
                {formatClock(secondsRemaining)}
              </span>
              <button type="button" className="pause-btn" onClick={togglePause}>
                Pause
              </button>
            </div>
          </div>

          <p className="question-text">{renderMath(currentQuestion.text)}</p>

          {currentQuestion.image && (
            <div className="question-image-frame">
              <img
                className="question-image"
                src={`/question-images/${currentQuestion.image}`}
                alt="Diagram for this question"
              />
            </div>
          )}

          {currentQuestion.type === "multiple_choice" ? (
            <div className="choices">
              {currentQuestion.choices.map((choice) => {
                const letter = choice.trim().charAt(0);
                const isSelected = selected === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    className={`choice-btn${isSelected ? " selected" : ""}`}
                    onClick={() => handleSelectChoice(letter)}
                  >
                    {renderMath(choice)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="free-response">
              <input
                type="text"
                className="free-response-input"
                placeholder="Type your answer"
                value={freeResponse}
                onChange={(e) => setFreeResponse(e.target.value)}
                onKeyDown={handleFreeResponseKeyDown}
              />
            </div>
          )}

          <button type="button" className="primary-btn" onClick={handleNext}>
            Next
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Calculator show={showCalculator} />
      {body}
    </>
  );
}

export default TimedTest;
