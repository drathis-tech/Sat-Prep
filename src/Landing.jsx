function Landing({ onStartPractice, onStartTimed }) {
  return (
    <>
      <header className="content-header">
        <div>
          <h1 className="content-title">Choose a Study Mode</h1>
          <p className="content-subtitle">
            Practice at your own pace, or simulate the full digital SAT under real timing.
          </p>
        </div>
      </header>

      <div className="mode-cards">
        <div className="question-card mode-card">
          <h2>Practice Mode</h2>
          <p>
            One question at a time, no timer. Get instant correct/incorrect feedback and a full
            explanation after every answer. Filter by subject or drill a specific skill.
          </p>
          <button type="button" className="primary-btn" onClick={onStartPractice}>
            Start Practicing
          </button>
        </div>

        <div className="question-card mode-card">
          <h2>Timed Test</h2>
          <p>
            The real digital SAT structure: two Reading &amp; Writing modules, a 10-minute break,
            then two Math modules — each with its own countdown timer and locked-in answers.
          </p>
          <button type="button" className="primary-btn" onClick={onStartTimed}>
            Start Timed Test
          </button>
        </div>
      </div>
    </>
  );
}

export default Landing;
