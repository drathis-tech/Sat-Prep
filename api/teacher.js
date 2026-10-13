import { computeAccuracy, computeScore } from "../shared/scoring.js";
import { query } from "./_lib/db.js";
import { readJson, send, sendError } from "./_lib/http.js";
import { cleanNickname, hashPin, isValidPin, verifyPin } from "./_lib/auth.js";
import {
  deleteSetting,
  endTeacherSession,
  getSetting,
  isTeacher,
  setSetting,
  startTeacherSession,
} from "./_lib/teacher.js";

const MAX_FAILED = 5;
const LOCK_MINUTES = 5;

// What the teacher page shows. Anyone may learn whether teacher access has
// been set up and whether sign-up needs a class code (the sign-in screen
// asks); the student list and the code itself are for the teacher only.
async function buildState(req, signedIn) {
  const [password, classCode] = await Promise.all([getSetting("teacher_password"), getSetting("class_code")]);
  const configured = Boolean(password);
  const teacher = signedIn ?? (configured && (await isTeacher(req)));
  const state = { configured, signedIn: teacher, classCodeRequired: Boolean(classCode) };
  if (!teacher) return state;

  const students = await query(
    `SELECT s.id, s.nickname, s.answered, s.correct, s.created_at,
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
      joined: s.created_at,
      lastActive: s.last_active,
    })),
  };
}

async function setup(req, res, body) {
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 72) {
    return sendError(res, 400, "Choose a teacher password of at least 8 characters.");
  }
  // First one in wins; after that the password can only be used, not set.
  const created = await query(
    `INSERT INTO settings (key, value) VALUES ('teacher_password', $1)
     ON CONFLICT (key) DO NOTHING RETURNING key`,
    [hashPin(password)]
  );
  if (!created.length) return sendError(res, 409, "Teacher access is already set up. Log in instead.");
  await startTeacherSession(res);
  send(res, 200, await buildState(req, true));
}

async function login(req, res, body) {
  const stored = await getSetting("teacher_password");
  if (!stored) return sendError(res, 409, "Teacher access hasn't been set up yet.");

  const lockedUntil = Number(await getSetting("teacher_locked_until")) || 0;
  if (lockedUntil > Date.now()) {
    return sendError(res, 429, `Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.`);
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !verifyPin(password, stored)) {
    const failed = (Number(await getSetting("teacher_failed")) || 0) + 1;
    if (failed >= MAX_FAILED) {
      await setSetting("teacher_locked_until", String(Date.now() + LOCK_MINUTES * 60_000));
      await setSetting("teacher_failed", "0");
    } else {
      await setSetting("teacher_failed", String(failed));
    }
    return sendError(res, 401, "Wrong password.");
  }

  await setSetting("teacher_failed", "0");
  await startTeacherSession(res);
  send(res, 200, await buildState(req, true));
}

async function teacherAction(req, res, body) {
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
    // Sign the student out everywhere, so only the new PIN gets back in.
    await query("DELETE FROM sessions WHERE student_id = $1", [studentId]);
  } else if (body.action === "rename") {
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
  } else if (body.action === "remove") {
    await query("DELETE FROM students WHERE id = $1", [studentId]);
  } else {
    return sendError(res, 400, "Unknown action.");
  }

  send(res, 200, await buildState(req, true));
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") return send(res, 200, await buildState(req));
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return sendError(res, 405, "Method not allowed");
    }

    const body = await readJson(req);
    if (body.action === "setup") return await setup(req, res, body);
    if (body.action === "login") return await login(req, res, body);
    if (body.action === "logout") {
      await endTeacherSession(req, res);
      return send(res, 200, await buildState(req, false));
    }

    if (!(await isTeacher(req))) return sendError(res, 401, "Teacher sign-in required.");
    return await teacherAction(req, res, body);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "Something went wrong on the server. Please try again.");
  }
}
