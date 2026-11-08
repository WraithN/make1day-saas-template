// Edge-safe HMAC signature for the operator session cookie.
//
// Before this existed, middleware.ts accepted ANY cookie with the admin
// session name: an attacker could set `sk_admin_session=forged` and skip the
// Edge branch entirely (the Node layout still validated the id, but the
// middleware gate was cosmetic). The cookie now carries `<sid>.<hmac>` and is
// verified with Web Crypto, which works in both Edge and Node runtimes.
//
// No Node built-ins — this file is safe to import from middleware.ts.

const encoder = new TextEncoder();

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.LICENSE_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ""
  );
}

function base64url(bytes: ArrayBuffer): string {
  const raw = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(
    await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)),
  );
}

/** Sign a fresh session id. No secret → no session (fail closed). */
export async function signAdminSession(sid: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  return `${sid}.${await hmac(sid, key)}`;
}

/** Verify a cookie value and return the raw session id, or null. */
export async function verifyAdminSession(
  value: string | undefined | null,
): Promise<string | null> {
  if (!value) return null;
  const key = secret();
  if (!key) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null; // legacy / unsigned cookie
  const sid = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(sid, key);
  // Fixed-length signature; a plain comparison is fine here (no early-exit
  // secret oracle — the value being compared IS the signature).
  return sig === expected ? sid : null;
}

/** Extract the sid for deletion without re-verifying (logout path). */
export function adminSidFromCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  return (dot > 0 ? value.slice(0, dot) : value) || null;
}
