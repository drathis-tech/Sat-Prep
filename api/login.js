import { query } from "./_lib/db.js";
import { readJson, route, send, sendError } from "./_lib/http.js";
import {
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
  cleanNickname,
  hashPin,
  isValidPin,
  startSession,
  verifyPin,
} from "./_lib/auth.js";
import { getStudentState } from "./_lib/state.js";

export default route("POST", async (req, res) => {
  const body = await readJson(req);
  const nickname = cleanNickname(body.nickname);
  if (!nickname) {
    return sendError(res, 400, "Nicknames are 2–16 characters: letters, numbers, spaces, - or _.");
  }
  if (!isValidPin(body.pin)) return sendError(res, 400, "Your PIN must be exactly 4 digits.");

  const key = nickname.toLowerCase();
  let studentId;

  if (body.create) {
    const created = await query(
      `INSERT INTO students (nickname, nickname_key, pin_hash) VALUES ($1, $2, $3)
       ON CONFLICT (nickname_key) DO NOTHING RETURNING id`,
      [nickname, key, hashPin(body.pin)]
    );
    if (!created.length) return sendError(res, 409, "That nickname is taken. Pick another, or log in instead.");
    studentId = created[0].id;
  } else {
    const rows = await query(
      `SELECT id, pin_hash, (locked_until IS NOT NULL AND locked_until > now()) AS locked
         FROM students WHERE nickname_key = $1`,
      [key]
    );
    const student = rows[0];
    if (!student) return sendError(res, 404, "No student with that nickname. New here? Choose “New student”.");
    if (student.locked) {
      return sendError(res, 429, `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes.`);
    }
    if (!verifyPin(body.pin, student.pin_hash)) {
      await query(
        `UPDATE students
            SET locked_until = CASE WHEN failed_logins + 1 >= $2
                                    THEN now() + make_interval(mins => $3) ELSE locked_until END,
                failed_logins = CASE WHEN failed_logins + 1 >= $2 THEN 0 ELSE failed_logins + 1 END
          WHERE id = $1`,
        [student.id, MAX_FAILED_LOGINS, LOCK_MINUTES]
      );
      return sendError(res, 401, "Wrong PIN.");
    }
    await query("UPDATE students SET failed_logins = 0, locked_until = NULL WHERE id = $1", [student.id]);
    studentId = student.id;
  }

  await startSession(res, studentId);
  send(res, 200, await getStudentState(studentId));
});
