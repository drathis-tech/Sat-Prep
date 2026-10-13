import { query } from "./db.js";
import { currentStudentId } from "./auth.js";

// The teacher tools belong to one account: the site owner's own student
// nickname. There is no separate teacher role or password — whoever is
// signed in as this nickname has the tools. Nicknames are unique, so no one
// else can register it. Set OWNER_NICKNAME to use a different account.
const OWNER_NICKNAME = (process.env.OWNER_NICKNAME || "pietro").trim().toLowerCase();

export function isOwnerNickname(nickname) {
  return String(nickname ?? "").trim().toLowerCase() === OWNER_NICKNAME;
}

// Resolves to the owner's student id when the request comes from the owner
// account, otherwise null.
export async function ownerStudentId(req) {
  const studentId = await currentStudentId(req);
  if (!studentId) return null;
  const rows = await query("SELECT nickname FROM students WHERE id = $1", [studentId]);
  return rows.length && isOwnerNickname(rows[0].nickname) ? studentId : null;
}

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
