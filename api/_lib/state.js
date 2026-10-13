import { query } from "./db.js";

// Everything the browser needs to draw a student's hub: lifetime totals for
// the score, per-domain totals for the planet rings, and how many times each
// question has been answered (so practice can serve unseen questions first).
export async function getStudentState(studentId) {
  const [students, domainRows, seenRows] = await Promise.all([
    query("SELECT id, nickname, answered, correct FROM students WHERE id = $1", [studentId]),
    query(
      `SELECT domain,
              count(*)::int AS attempted,
              (count(*) FILTER (WHERE is_correct))::int AS correct
         FROM answers
        WHERE student_id = $1 AND counted
        GROUP BY domain`,
      [studentId]
    ),
    query("SELECT question_id, count(*)::int AS n FROM answers WHERE student_id = $1 GROUP BY question_id", [
      studentId,
    ]),
  ]);

  const student = students[0];
  if (!student) return null;

  const domains = {};
  for (const row of domainRows) domains[row.domain] = { attempted: row.attempted, correct: row.correct };
  const seen = {};
  for (const row of seenRows) seen[row.question_id] = row.n;

  return {
    student: { id: student.id, nickname: student.nickname },
    totals: { answered: student.answered, correct: student.correct },
    domains,
    seen,
  };
}
