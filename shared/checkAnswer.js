// Answer checking. Only the server imports this alongside the full question
// bank — the browser never receives correctAnswer, so it can't check locally.

export function normalizeAnswer(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAnswerCorrect(question, given) {
  if (!given) return false;
  if (question.type === "multiple_choice") {
    return given === question.correctAnswer;
  }
  return normalizeAnswer(given) === normalizeAnswer(question.correctAnswer);
}
