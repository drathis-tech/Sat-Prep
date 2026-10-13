// The one scoring function for the whole app. The API uses it to rank the
// leaderboard and the browser imports the same file for the live readout,
// so the two can never disagree.
//
//   accuracy = correct / answered
//   score    = 1000 * accuracy * answered / (answered + 50)
//
// Below 60% accuracy the score is gated to 0. Volume is uncapped, but the
// answered / (answered + 50) term only approaches 1, so the score can never
// exceed 1000.

export const ACCURACY_GATE = 0.6;
export const VOLUME_HALF_POINT = 50;
export const MAX_SCORE = 1000;

export function computeAccuracy({ answered, correct }) {
  return answered > 0 ? correct / answered : 0;
}

export function computeScore({ answered, correct }) {
  if (!answered || answered <= 0) return 0;
  const accuracy = computeAccuracy({ answered, correct });
  if (accuracy < ACCURACY_GATE) return 0;
  const raw = MAX_SCORE * accuracy * (answered / (answered + VOLUME_HALF_POINT));
  return Math.min(MAX_SCORE, Math.round(raw));
}

export function formatAccuracy(stats) {
  return stats.answered > 0 ? `${Math.round(computeAccuracy(stats) * 100)}%` : "—";
}
