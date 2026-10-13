import { computeAccuracy, computeScore } from "../shared/scoring.js";
import { query } from "./_lib/db.js";
import { readJson, send, sendError } from "./_lib/http.js";
import { cleanNickname, hashPin, isValidPin } from "./_lib/auth.js";
import { deleteSetting, getSetting, ownerStudentId, setSetting } from "./_lib/teacher.js";

// What the teacher tools show. Anyone may learn whether sign-up needs a
// class code (the sign-in screen asks); the student list and the code
// itself go to the owner account only.
async function buildState(ownerId) {
  const classCode = await getSetting("class_code");
  const state = { isOwner: Boolean(ownerId), classCodeRequired: Boolean(classCode) };
  if (!ownerId) return state;

  const students = await query(
    `SELECT s.id, s.nickname, s.answered, s.correct,
            (SELECT max(a.created_at) FROM answers a WHERE a.student_id = s.id) AS last_active
       FROM students s
      ORDER BY s.nickname_key`
  );
  return {
    ...state,
    classCode: classCode || "",
    students: students.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      score: computeScore(s),
      accuracy: computeAccuracy(s),
      answered: s.answered,
      lastActive: s.last_active,
      isYou: s.id === ownerId,
    })),
  };
}

async function runAction(res, body, ownerId) {
  const studentId = Number(body.studentId);

  if (body.action === "classCode") {
    const code = String(body.code ?? "").trim();
    if (code === "") await deleteSetting("class_code");
    else if (!/^[A-Za-z0-9-]{3,24}$/.test(code)) {
      return sendError(res, 400, "Class codes are 3–24 letters, numbers or dashes.");
    } else await setSetting("class_code", code);
  } else if (body.action === "resetPin") {
    if (!isValidPin(body.pin)) return sendError(res, 400, "The new PIN must be exactly 4 digits.");
    await query(
      "UPDATE students SET pin_hash = $2, failed_logins = 0, locked_until = NULL WHERE id = $1",
      [studentId, hashPin(body.pin)]
    );
    // Sign that student out everywhere, so only the new PIN gets back in.
    // (Resetting your own PIN keeps you signed in on this device's session.)
    if (studentId !== ownerId) await query("DELETE FROM sessions WHERE student_id = $1", [studentId]);
  } else if (body.action === "rename" || body.action === "remove") {
    // The tools hang off the owner's nickname, so that account stays as it is.
    if (studentId === ownerId) {
      return sendError(res, 400, "That's your own account — it can't be renamed or removed here.");
    }
    if (body.action === "remove") {
      await query("DELETE FROM students WHERE id = $1", [studentId]);
    } else {
      const nickname = cleanNickname(body.nickname);
      if (!nickname) {
        return sendError(res, 400, "Nicknames are 2–16 characters: letters, numbers, spaces, - or _.");
      }
      const taken = await query("SELECT 1 FROM students WHERE nickname_key = $1 AND id <> $2", [
        nickname.toLowerCase(),
        studentId,
      ]);
      if (taken.length) return sendError(res, 409, "Another student already has that nickname.");
      await query("UPDATE students SET nickname = $2, nickname_key = $3 WHERE id = $1", [
        studentId,
        nickname,
        nickname.toLowerCase(),
      ]);
    }
  } else {
    return sendError(res, 400, "Unknown action.");
  }

  send(res, 200, await buildState(ownerId));
}

export default async function handler(req, res) {
  try {
    const ownerId = await ownerStudentId(req);
    if (req.method === "GET") return send(res, 200, await buildState(ownerId));
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return sendError(res, 405, "Method not allowed");
    }
    if (!ownerId) return sendError(res, 403, "These tools aren't available on this account.");
    return await runAction(res, await readJson(req), ownerId);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "Something went wrong on the server. Please try again.");
  }
}
