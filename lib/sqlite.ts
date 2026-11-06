// Local SQLite persistence for the dev / self-hosted install.
//
// ShipKit ships two storage backends:
//   * Supabase (Postgres) — the production path, used when a service-role key
//     is configured. See lib/license.ts, lib/orders.ts, lib/stats.ts.
//   * SQLite (this file) — the LOCAL path. A single file under .data/ that
//     replaces the previous .data/*.json stores with one queryable database.
//
// Why `node:sqlite` and not better-sqlite3: it ships with Node 22.5+, so the
// template needs ZERO native compilation and ZERO extra dependencies. A
// customer who clones the repo and runs `npm install` gets a working local
// database with no toolchain. The module is reached through
// process.getBuiltinModule so the bundler never tries to inline it — it is a
// Node builtin, not a package.
//
// Durability: a file under .data/ is durable on a normal host (VPS, Docker
// with a volume) but NOT on an ephemeral serverless filesystem. Production
// deployments should configure Supabase — see .env.example.

import { mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

export type SqliteValue = string | number | bigint | null | Uint8Array;
export type SqliteRow = Record<string, SqliteValue>;

/** The subset of the node:sqlite API this module relies on. */
export type SqliteStatement = {
  all(...params: SqliteValue[]): SqliteRow[];
  get(...params: SqliteValue[]): SqliteRow | undefined;
  run(...params: SqliteValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
};

export type SqliteDatabase = {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  close(): void;
};

type SqliteModule = {
  DatabaseSync: new (path: string) => SqliteDatabase;
};

const globals = globalThis as unknown as { __skSqlite?: SqliteDatabase };

/** Absolute path of the database file. Overridable for tests / containers. */
export function dbPath(): string {
  const custom = process.env.SQLITE_PATH?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return path.join(process.cwd(), ".data", "shipkit.db");
}

function loadSqlite(): SqliteModule {
  // `process.getBuiltinModule` (Node 22.3+) returns a built-in module
  // synchronously, with no require() involved — so the bundler never tries to
  // resolve "node:sqlite" as a package (webpack's node-builtin externals list
  // does not know it yet, and a require() would fail at runtime).
  // The API landed in the same Node release line as `node:sqlite` itself, so
  // its absence means the module is unavailable too.
  const getBuiltin = (
    process as unknown as {
      getBuiltinModule?: (id: string) => unknown;
    }
  ).getBuiltinModule;
  if (typeof getBuiltin === "function") {
    const mod = getBuiltin.call(process, "node:sqlite");
    if (mod) return mod as SqliteModule;
  }

  throw new Error(
    "ShipKit's local database needs Node.js 22.5+ (built-in `node:sqlite`). " +
      "Upgrade Node, or configure Supabase (SUPABASE_SERVICE_ROLE_KEY) to use " +
      "the hosted database instead.",
  );
}

/**
 * Open (once per process) the local database and make sure the schema exists.
 * The handle is cached on globalThis so Next.js dev hot-reloads do not open
 * a new file descriptor on every recompile.
 */
export function getDb(): SqliteDatabase {
  if (globals.__skSqlite) return globals.__skSqlite;

  const { DatabaseSync } = loadSqlite();
  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });

  const database = new DatabaseSync(file);
  // WAL keeps readers from blocking the writer — the admin console reads while
  // a webhook writes a license.
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  migrate(database);
  importLegacyJson(database);

  globals.__skSqlite = database;
  return database;
}

/** Close the handle (tests / graceful shutdown). */
export function closeDb(): void {
  globals.__skSqlite?.close();
  globals.__skSqlite = undefined;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS licenses (
  jti        TEXT PRIMARY KEY,
  key        TEXT NOT NULL,
  email      TEXT,
  plan       TEXT NOT NULL,
  order_id   TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_created ON licenses(created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  provider          TEXT NOT NULL,
  provider_order_id TEXT NOT NULL,
  email             TEXT,
  plan              TEXT,
  amount            REAL,
  currency          TEXT,
  status            TEXT NOT NULL,
  created_at        TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider
  ON orders(provider, provider_order_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  id         TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_id   TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quota (
  ip_key TEXT PRIMARY KEY,
  day    TEXT NOT NULL,
  used   INTEGER NOT NULL DEFAULT 0
);

-- AI chat quota: one row per user, reset every UTC day.
-- The Supabase mirror of this table lives in
-- supabase/migrations/0009_ai_usage.sql. The "day" column holds the UTC day
-- (YYYY-MM-DD) the counter belongs to, so a row from an earlier day starts
-- over at zero.
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT PRIMARY KEY,
  day     TEXT NOT NULL,
  used    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_day ON ai_usage(day);

CREATE TABLE IF NOT EXISTS pageviews (
  path       TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Session-level traffic events. The pageviews table above only counts hits
-- per path, which cannot answer "how many visitors bounced?" or "what is the
-- conversion rate?". These rows carry a visitor id + a session id so the
-- funnel can be reconstructed.
CREATE TABLE IF NOT EXISTS traffic_events (
  id         TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  kind       TEXT NOT NULL,      -- view | cta | checkout | conversion
  path       TEXT,
  label      TEXT,               -- CTA name / conversion kind
  referrer   TEXT,
  email      TEXT,               -- for attributing a paid order to a session
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_traffic_events_created
  ON traffic_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_session
  ON traffic_events(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_events_visitor
  ON traffic_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_traffic_events_kind
  ON traffic_events(kind);
CREATE INDEX IF NOT EXISTS idx_traffic_events_email
  ON traffic_events(email);

-- Accounts + roles, the LOCAL mirror of the Supabase "profiles" table.
--
-- Supabase keys a profile by the auth.users uuid; locally there is no auth
-- directory, so the email is the primary key. The column names mirror the
-- Supabase table (see supabase/migrations/0004_profiles_rbac.sql) so the
-- same SQL works against both stores and the migration script can move rows
-- across without renaming anything.
--
-- The "id" column is optional: it holds the Supabase auth user id once a
-- user has signed in through Supabase while running in local mode.
CREATE TABLE IF NOT EXISTS profiles (
  email          TEXT PRIMARY KEY,
  id             TEXT,
  role           TEXT NOT NULL DEFAULT 'member',
  display_name   TEXT,
  full_name      TEXT,
  company        TEXT,
  -- Local-auth fields (used only when SUPABASE_SERVICE_ROLE_KEY is absent).
  -- The password is a scrypt hash + salt, never plaintext. There is no local
  -- password SIGN-IN consumer yet — see docs/email.md / AGENTS.md Known gaps.
  password_hash  TEXT,
  salt           TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE TABLE IF NOT EXISTS admin_users (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  sid        TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Support tickets (LOCAL mirror of supabase/migrations/0010_support_tickets.sql).
-- Column names match the Supabase table so the same queries work against both
-- backends. user_id is NULL for anonymous submissions; email is always stored
-- so an operator can reply even without a signed-in account.
CREATE TABLE IF NOT EXISTS support_tickets (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',  -- open | answered | closed
  user_id    TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(email);

-- One-time auth tokens for the LOCAL SQLite auth path. The raw token is NEVER
-- stored: only its SHA-256 hash. The row is deleted on first use (one-time),
-- and expires_at enforces a hard deadline. The Supabase path uses Supabase
-- Auth's own resetPasswordForEmail / verifyOtp instead of these tables.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function migrate(database: SqliteDatabase): void {
  database.exec(SCHEMA);

  // `CREATE TABLE IF NOT EXISTS` never adds a column to a table that already
  // exists, so a column added in a later version would be missing on every
  // existing install. Add it here instead.
  addColumnIfMissing(database, "traffic_events", "email", "text");
  addColumnIfMissing(database, "profiles", "id", "text");
  addColumnIfMissing(database, "profiles", "role", "text not null default 'member'");
  addColumnIfMissing(database, "profiles", "display_name", "text");
  addColumnIfMissing(database, "profiles", "full_name", "text");
  addColumnIfMissing(database, "profiles", "company", "text");
  addColumnIfMissing(database, "profiles", "created_at", "text");
  addColumnIfMissing(database, "profiles", "updated_at", "text");
  // Local-auth columns added for the password-reset / email-verification flow.
  addColumnIfMissing(database, "profiles", "password_hash", "text");
  addColumnIfMissing(database, "profiles", "salt", "text");
  addColumnIfMissing(database, "profiles", "email_verified", "integer not null default 0");
}

/** Add a column when the table exists but does not have it yet. */
function addColumnIfMissing(
  database: SqliteDatabase,
  table: string,
  column: string,
  type: string,
): void {
  try {
    const cols = database.prepare(`PRAGMA table_info(${table})`).all() as {
      name?: string;
    }[];
    if (!cols.length) return;
    if (cols.some((c) => c.name === column)) return;
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch {
    /* the table does not exist yet — SCHEMA will create it next boot */
  }
}

// ── Tiny query helpers ─────────────────────────────────────────────────────

/** SQLite rejects booleans/undefined as bound values — normalise them. */
function bind(value: unknown): SqliteValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "bigint") return value;
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return value;
  return String(value);
}

export function all<T extends SqliteRow = SqliteRow>(
  sql: string,
  ...params: unknown[]
): T[] {
  return getDb().prepare(sql).all(...params.map(bind)) as T[];
}

export function get<T extends SqliteRow = SqliteRow>(
  sql: string,
  ...params: unknown[]
): T | undefined {
  return getDb().prepare(sql).get(...params.map(bind)) as T | undefined;
}

export function run(sql: string, ...params: unknown[]): number {
  const result = getDb().prepare(sql).run(...params.map(bind));
  return Number(result.changes);
}

/**
 * Run `fn` inside an IMMEDIATE transaction. Used for read-modify-write
 * sequences (the free-download quota) so two concurrent requests cannot both
 * see "one slot left" and hand it out twice.
 */
export function tx<T>(fn: () => T): T {
  const database = getDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      database.exec("ROLLBACK");
    } catch {
      /* the transaction was already aborted */
    }
    throw err;
  }
}

// ── One-time import of the legacy .data/*.json stores ──────────────────────
// The template used to keep three JSON files. Existing installs must not lose
// their licenses / orders / pageviews on upgrade, so the first boot copies
// whatever is still on disk into SQLite and records that it did so.

type LegacyLicense = {
  jti: string;
  key: string;
  email?: string;
  plan: string;
  orderId?: string;
  createdAt: string;
  expiresAt?: string | null;
};

type LegacyOrder = {
  id: string;
  provider: string;
  providerOrderId: string;
  email?: string;
  plan?: string | null;
  amount?: number | null;
  currency?: string | null;
  status: string;
  createdAt: string;
};

function readJson<T>(file: string): T | null {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function importLegacyJson(database: SqliteDatabase): void {
  const done = database
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get("legacy_json_imported");
  if (done) return;

  const dir = path.join(process.cwd(), ".data");

  const licenseStore = readJson<{
    licenses?: LegacyLicense[];
    events?: Record<string, string>;
    quota?: Record<string, { day: string; used: number }>;
  }>(path.join(dir, "license-store.json"));

  const insertLicense = database.prepare(
    `INSERT OR IGNORE INTO licenses (jti, key, email, plan, order_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const l of licenseStore?.licenses ?? []) {
    insertLicense.run(
      l.jti,
      l.key,
      l.email ?? null,
      l.plan,
      l.orderId ?? null,
      l.createdAt,
      l.expiresAt ?? null,
    );
  }

  const insertEvent = database.prepare(
    `INSERT OR IGNORE INTO webhook_events (id, event_type, event_id, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  for (const [id, createdAt] of Object.entries(licenseStore?.events ?? {})) {
    const sep = id.indexOf(":");
    insertEvent.run(
      id,
      sep >= 0 ? id.slice(0, sep) : id,
      sep >= 0 ? id.slice(sep + 1) : id,
      createdAt,
    );
  }

  const insertQuota = database.prepare(
    `INSERT OR IGNORE INTO quota (ip_key, day, used) VALUES (?, ?, ?)`,
  );
  for (const [ipKey, entry] of Object.entries(licenseStore?.quota ?? {})) {
    insertQuota.run(ipKey, entry.day, entry.used);
  }

  const orderStore = readJson<{ orders?: LegacyOrder[] }>(
    path.join(dir, "orders.json"),
  );
  const insertOrder = database.prepare(
    `INSERT OR IGNORE INTO orders
      (id, provider, provider_order_id, email, plan, amount, currency, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const o of orderStore?.orders ?? []) {
    insertOrder.run(
      o.id,
      o.provider,
      o.providerOrderId,
      o.email ?? null,
      o.plan ?? null,
      o.amount ?? null,
      o.currency ?? null,
      o.status,
      o.createdAt,
    );
  }

  const statStore = readJson<{
    total?: number;
    pages?: Record<string, number>;
  }>(path.join(dir, "site-stats.json"));
  const insertPage = database.prepare(
    `INSERT OR IGNORE INTO pageviews (path, count, updated_at) VALUES (?, ?, ?)`,
  );
  const now = new Date().toISOString();
  for (const [p, count] of Object.entries(statStore?.pages ?? {})) {
    insertPage.run(p, count, now);
  }

  database
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
    .run("legacy_json_imported", now);
}
