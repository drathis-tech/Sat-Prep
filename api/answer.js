import { questions } from "../src/questions.js";
import { isAnswerCorrect } from "../shared/checkAnswer.js";
import { transaction } from "./_lib/db.js";
import { readJson, route, send, sendError } from "./_lib/http.js";
import { currentStudentId } from "./_lib/auth.js";

const byId = new Map(questions.map((q) => [q.id, q]));

// A repeat of the same question only scores again once the student has
// answered this many other questions since. Without it, anyone who has seen
// one explanation could resubmit that question forever for a perfect score.
const REPEAT_COOLDOWN = 15;

export default route("POST", async (req, res) => {
  const studentId = await currentStudentId(req);

  const body = await readJson(req);
  const question = byId.get(Number(body.questionId));
  if (!question) return sendError(res, 400, "Unknown question.");
  const given = typeof body.given === "string" ? body.given.trim().slice(0, 200) : "";
  if (!given) return sendError(res, 400, "No answer given.");

  const correct = isAnswerCorrect(question, given);

  // Guests (no account) get the verdict and the explanation, but nothing is
  // stored and nothing is scored.
  if (!studentId) {
    return send(res, 200, {
      questionId: question.id,
      domain: question.domain,
      correct,
      counted: false,
      guest: true,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      totals: null,
    });
  }

  // Locking the student row first serializes that student's submissions, so
  // a burst of parallel requests can't all slip past the repeat check.
  const results = await transaction([
    ["SELECT id FROM students WHERE id = $1 FOR UPDATE", [studentId]],
    [
      `INSERT INTO answers (student_id, question_id, domain, given, is_correct, counted)
       SELECT $1::int, $2::int, $3::text, $4::text, $5::boolean,
              (last.id IS NULL
               OR (SELECT count(*) FROM answers a WHERE a.student_id = $1::int AND a.id > last.id) >= $6::int)
         FROM (SELECT max(id) AS id FROM answers WHERE student_id = $1::int AND question_id = $2::int) last
       RETURNING counted`,
      [studentId, question.id, question.domain, given, correct, REPEAT_COOLDOWN],
    ],
    [
      `UPDATE students
          SET answered = answered + 1, correct = correct + $2::int
        WHERE id = $1
          AND (SELECT counted FROM answers WHERE student_id = $1 ORDER BY id DESC LIMIT 1)`,
      [studentId, correct ? 1 : 0],
    ],
    ["SELECT answered, correct FROM students WHERE id = $1", [studentId]],
  ]);

  const counted = Boolean(results[1][0]?.counted);
  const totals = results[3][0];
  if (!totals) return sendError(res, 401, "Not signed in");

  send(res, 200, {
    questionId: question.id,
    domain: question.domain,
    correct,
    counted,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    totals: { answered: totals.answered, correct: totals.correct },
  });
});
