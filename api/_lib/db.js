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
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teacher_sessions (
    token_hash TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

let sql;

// Vercel's database integrations name the connection string DATABASE_URL by
// default, but a custom prefix chosen when connecting renames it (for
// example STORAGE_URL or STORAGE_DATABASE_URL). Rather than depend on the
// name, take the standard ones first and otherwise any variable that holds a
// Postgres connection string, preferring the pooled, SSL one.
function findDatabaseUrl() {
  const isPostgres = (value) => /^postgres(ql)?:\/\//.test(value || "");
  for (const name of ["DATABASE_URL", "POSTGRES_URL"]) {
    if (isPostgres(process.env[name])) return process.env[name];
  }
  const candidates = Object.keys(process.env)
    .filter((name) => isPostgres(process.env[name]))
    .sort((x, y) => rank(x) - rank(y) || x.length - y.length);
  if (candidates.length) return process.env[candidates[0]];

  const urlish = Object.keys(process.env).filter((name) => /URL|POSTGRES|^PG/.test(name));
  throw new Error(
    "No database configured: no environment variable holds a Postgres connection string " +
      `(connect a Postgres database in Vercel). URL-like variables present: ${urlish.join(", ") || "none"}.`
  );
}

function rank(name) {
  if (/NO_SSL/.test(name)) return 3;
  if (/UNPOOLED|NON_POOLING/.test(name)) return 2;
  if (/PRISMA/.test(name)) return 1;
  return 0;
}

// `npm run dev` installs an in-process Postgres on this global (see
// vite.config.js) so the app runs locally with no hosted database.
function driver() {
  if (globalThis.__SAT_DEV_DB) return globalThis.__SAT_DEV_DB;
  if (!sql) {
    sql = neon(findDatabaseUrl());
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
