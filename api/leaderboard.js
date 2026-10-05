import { computeAccuracy, computeScore } from "../shared/scoring.js";
import { query } from "./_lib/db.js";
import { route, send } from "./_lib/http.js";
import { requireStudent } from "./_lib/auth.js";

const MAX_ROWS = 200;

export default route("GET", async (req, res) => {
  const studentId = await requireStudent(req, res);
  if (!studentId) return;

  const students = await query("SELECT id, nickname, answered, correct FROM students");

  const ranked = students
    .map((s) => ({
      id: s.id,
      nickname: s.nickname,
      score: computeScore(s),
      accuracy: computeAccuracy(s),
      answered: s.answered,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.answered - a.answered ||
        b.accuracy - a.accuracy ||
        a.nickname.localeCompare(b.nickname)
    )
    .map((row, i) => ({ ...row, rank: i + 1, isYou: row.id === studentId }));

  // Always include the current student, even when they rank below the cut.
  const rows = ranked
    .filter((row) => row.rank <= MAX_ROWS || row.isYou)
    .map((row) => ({
      rank: row.rank,
      nickname: row.nickname,
      score: row.score,
      accuracy: row.accuracy,
      answered: row.answered,
      isYou: row.isYou,
    }));

  send(res, 200, { rows, totalStudents: ranked.length });
});
