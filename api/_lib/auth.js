import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "./db.js";
import { readCookie, sendError } from "./http.js";

const COOKIE = "sat_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 5;

export function cleanNickname(raw) {
  const nickname = String(raw ?? "").trim().replace(/\s+/g, " ");
  return /^[A-Za-z0-9 _-]{2,16}$/.test(nickname) ? nickname : null;
}

export function isValidPin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function hashPin(pin) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin, stored) {
  const [saltHex, hashHex] = String(stored).split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieHeader(value, maxAge) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function startSession(res, studentId) {
  const token = randomBytes(32).toString("base64url");
  await query("INSERT INTO sessions (token_hash, student_id) VALUES ($1, $2)", [hashToken(token), studentId]);
  res.setHeader("Set-Cookie", cookieHeader(token, MAX_AGE_SECONDS));
}

export async function endSession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  res.setHeader("Set-Cookie", cookieHeader("", 0));
}

// Resolves to the signed-in student's id, or null.
export async function currentStudentId(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const rows = await query("SELECT student_id FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  return rows.length ? rows[0].student_id : null;
}

// Resolves to the signed-in student's id, or sends a 401 and resolves to null.
export async function requireStudent(req, res) {
  const studentId = await currentStudentId(req);
  if (!studentId) sendError(res, 401, "Not signed in");
  return studentId;
}
