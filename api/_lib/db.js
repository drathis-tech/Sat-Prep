import { neon } from "@neondatabase/serverless";

// Tables are created on first use, so there is no separate migration step:
// connect a Postgres database to the Vercel project and the app sets itself up.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    nickname TEXT NOT NULL,
    nickname_key TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    answered INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS answers (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    domain TEXT NOT NULL,
    given TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    counted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS answers_student_idx ON answers (student_id, id)`,
];

let sql;

// `npm run dev` installs an in-process Postgres on this global (see
// vite.config.js) so the app runs locally with no hosted database.
function driver() {
  if (globalThis.__SAT_DEV_DB) return globalThis.__SAT_DEV_DB;
  if (!sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("No database configured: set DATABASE_URL (connect a Postgres database in Vercel).");
    }
    sql = neon(url);
  }
  return {
    query: (text, params) => sql.query(text, params),
    transaction: (statements) => sql.transaction(statements.map(([text, params]) => sql.query(text, params))),
  };
}

let ready;

function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      for (const statement of SCHEMA) await driver().query(statement, []);
    })().catch((err) => {
      ready = undefined;
      throw err;
    });
  }
  return ready;
}

export async function query(text, params = []) {
  await ensureSchema();
  return driver().query(text, params);
}

// Runs [text, params] pairs as one transaction; resolves to one row array
// per statement.
export async function transaction(statements) {
  await ensureSchema();
  return driver().transaction(statements);
}
