// The operator session cookie name.
//
// Kept in its own module because it is imported by BOTH runtimes:
//   * the Edge middleware (which can only check the cookie's PRESENCE — it
//     cannot reach SQLite to validate the session id),
//   * the Node admin console (which performs the authoritative check).
//
// Do NOT put node:crypto / node:sqlite imports in this file.

export const ADMIN_SESSION_COOKIE = "sk_admin_session";
