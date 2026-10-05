import { ACCURACY_GATE, computeScore, formatAccuracy } from "../shared/scoring";
import { useStudent } from "./student";
import "./Competition.css";

// The live lifetime score. Reads straight from the student store, so it
// re-renders the instant an answer comes back from the server.
function ScoreReadout() {
  const { totals } = useStudent();
  const score = computeScore(totals);
  const gated = totals.answered > 0 && score === 0;

  return (
    <span
      className="cm-score"
      role="status"
      title={gated ? `Reach ${Math.round(ACCURACY_GATE * 100)}% accuracy to score` : undefined}
    >
      <span className="cm-score-label">Score</span>
      <span className="cm-score-value">{score}</span>
      <span className="cm-score-detail">
        {formatAccuracy(totals)} · {totals.answered} answered
      </span>
      {gated && (
        <span className="cm-score-gate">below {Math.round(ACCURACY_GATE * 100)}%</span>
      )}
    </span>
  );
}

export default ScoreReadout;
