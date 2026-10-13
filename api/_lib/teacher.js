import { randomBytes } from "node:crypto";
import { query } from "./db.js";
import { cookieHeader, hashToken } from "./auth.js";
import { readCookie } from "./http.js";

const COOKIE = "sat_teacher";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getSetting(key) {
  const rows = await query("SELECT value FROM settings WHERE key = $1", [key]);
  return rows.length ? rows[0].value : null;
}

export async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

export async function deleteSetting(key) {
  await query("DELETE FROM settings WHERE key = $1", [key]);
}

// Class codes are typed by students, so case and stray spaces don't count.
export function classCodeMatches(given, expected) {
  const norm = (value) => String(value ?? "").trim().toLowerCase();
  return norm(given) !== "" && norm(given) === norm(expected);
}

export async function startTeacherSession(res) {
  const token = randomBytes(32).toString("base64url");
  await query("INSERT INTO teacher_sessions (token_hash) VALUES ($1)", [hashToken(token)]);
  res.setHeader("Set-Cookie", cookieHeader(COOKIE, token, MAX_AGE_SECONDS));
}

export async function endTeacherSession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) await query("DELETE FROM teacher_sessions WHERE token_hash = $1", [hashToken(token)]);
  res.setHeader("Set-Cookie", cookieHeader(COOKIE, "", 0));
}

export async function isTeacher(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const rows = await query("SELECT 1 FROM teacher_sessions WHERE token_hash = $1", [hashToken(token)]);
  return rows.length > 0;
}
