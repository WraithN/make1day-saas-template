#!/usr/bin/env node
/**
 * Export the local account / role store so it can be moved into Supabase.
 *
 * The admin console stores accounts and roles in the local SQLite database
 * (`.data/shipkit.db`, table `profiles`) whenever SUPABASE_SERVICE_ROLE_KEY is
 * not configured. When you switch to Supabase, those roles have to come along
 * — this script reads them out and prints them in a form you can import.
 *
 * Usage:
 *   node scripts/export-local-profiles.mjs              # JSON to stdout
 *   node scripts/export-local-profiles.mjs --sql        # SQL for Supabase
 *   node scripts/export-local-profiles.mjs --out profiles.json
 *   SQLITE_PATH=/var/lib/shipkit.db node scripts/export-local-profiles.mjs
 *
 * The JSON shape matches the Supabase `profiles` table
 * (supabase/migrations/0004_profiles_rbac.sql), so a small script can insert
 * the rows once the users exist in Supabase Auth:
 *
 *   INSERT INTO public.profiles (id, email, role, display_name, full_name,
 *                                company, created_at, updated_at)
 *   VALUES ('<auth user id>', '<email>', '<role>', ...);
 */
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) {
      const key = cur.slice(2);
      const next = arr[i + 1];
      acc.push([key, next && !next.startsWith("--") ? next : "true"]);
    }
    return acc;
  }, []),
);

// The database location mirrors lib/sqlite.ts.
const custom = process.env.SQLITE_PATH?.trim();
const dbPath = custom
  ? path.isAbsolute(custom)
    ? custom
    : path.join(process.cwd(), custom)
  : path.join(process.cwd(), ".data", "shipkit.db");

if (!existsSync(dbPath)) {
  console.error(`ERROR: no local database at ${dbPath}`);
  console.error(
    "Start the app once so the database is created, then run this again.",
  );
  process.exit(1);
}

let DatabaseSync;
try {
  ({ DatabaseSync } = await import("node:sqlite"));
} catch {
  console.error(
    "ERROR: node:sqlite is unavailable — this script needs Node.js 22.5+.",
  );
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });

let rows = [];
try {
  rows = db
    .prepare(
      `SELECT email, id, role, display_name, full_name, company,
              created_at, updated_at
         FROM profiles
        ORDER BY created_at ASC`,
    )
    .all();
} catch {
  console.error(
    "ERROR: the local database has no `profiles` table yet " +
      "(the admin console has not been opened, or this is an old database).",
  );
  process.exit(1);
} finally {
  db.close();
}

const profiles = rows.map((r) => ({
  email: r.email,
  id: r.id ?? null,
  role: r.role ?? "member",
  display_name: r.display_name ?? null,
  full_name: r.full_name ?? null,
  company: r.company ?? null,
  created_at: r.created_at ?? null,
  updated_at: r.updated_at ?? null,
}));

if (!profiles.length) {
  console.error("No local accounts to export.");
  process.exit(0);
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

// The Supabase `profiles` table is keyed by the auth user id, so an account
// that never signed in through Supabase has no id yet.
const withoutAuthId = profiles.filter((p) => !p.id);

if (args.sql) {
  const importable = profiles.filter((p) => p.id);
  const lines = importable.map(
    (p) =>
      `INSERT INTO public.profiles (id, email, role, display_name, full_name, company, created_at, updated_at) VALUES (${sqlString(
        p.id,
      )}, ${sqlString(p.email)}, ${sqlString(p.role)}, ${sqlString(
        p.display_name,
      )}, ${sqlString(p.full_name)}, ${sqlString(
        p.company,
      )}, ${sqlString(p.created_at)}, ${sqlString(p.updated_at)}) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, updated_at = EXCLUDED.updated_at;`,
  );
  console.log(lines.join("\n"));
} else {
  console.log(JSON.stringify(profiles, null, 2));
}

if (args.out && args.out !== "true") {
  const outPath = path.isAbsolute(args.out)
    ? args.out
    : path.join(process.cwd(), args.out);
  writeFileSync(
    outPath,
    `${JSON.stringify(profiles, null, 2)}\n`,
    "utf8",
  );
  console.error(`\nWrote ${profiles.length} account(s) to ${outPath}`);
}

if (withoutAuthId.length) {
  console.error(
    `\n${withoutAuthId.length} account(s) have no Supabase auth id yet and ` +
      "cannot be inserted into public.profiles as-is: " +
      withoutAuthId.map((p) => p.email).join(", ") +
      "\nCreate the matching Supabase Auth users first, then re-run with the " +
      "auth ids filled in.",
  );
}

console.error(
  `\n${profiles.length} local account(s) ready. ` +
    "Import them after the users exist in Supabase Auth " +
    "(the `id` column must be the Supabase auth user id).",
);
