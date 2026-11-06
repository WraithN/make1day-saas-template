// Visitor + session identity for the traffic funnel.
//
// Kept free of Node built-ins so it can be imported from the Edge middleware
// as well as from Node route handlers. Only the Web Crypto API is used
// (available in both runtimes).
//
// Two identifiers:
//   * visitor — a long-lived, opaque, first-party token. It is NOT a person:
//     it cannot be traced back to an account and it holds no personal data.
//   * session — a short-lived token that identifies one "visit". A session
//     ends after 30 minutes of inactivity, which is what makes the bounce
//     rate meaningful (a bounce = one page view and nothing else).

export const VISITOR_COOKIE = "sk_vid";
export const SESSION_COOKIE = "sk_sid";

/** Cookie lifetime for the visitor token (1 year). */
export const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * Cookie lifetime for the session token. It is refreshed on every hit, so a
 * continuous visitor keeps one session; a visitor who stops for longer than
 * this starts a new one.
 */
export const SESSION_COOKIE_MAX_AGE = 30 * 60;

/** A random opaque token. Hex keeps it URL- and cookie-safe. */
export function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Read a cookie value from a raw Cookie header. */
export function readCookie(
  header: string | null | undefined,
  name: string,
): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/** A cookie value is only usable if it looks like one of our tokens. */
export function isValidToken(value: string | null | undefined): value is string {
  return !!value && /^[a-f0-9]{32}$/.test(value);
}

export type VisitorIdentity = {
  visitorId: string;
  sessionId: string;
  /** True when a new visitor cookie has to be issued. */
  isNewVisitor: boolean;
  /** True when a new session cookie has to be issued. */
  isNewSession: boolean;
};

/**
 * Resolve the visitor + session ids for a request, creating them when
 * missing. The caller is responsible for writing the returned cookies.
 */
export function resolveIdentity(cookieHeader: string | null | undefined): VisitorIdentity {
  const rawVisitor = readCookie(cookieHeader, VISITOR_COOKIE);
  const rawSession = readCookie(cookieHeader, SESSION_COOKIE);

  const visitorOk = isValidToken(rawVisitor);
  const sessionOk = isValidToken(rawSession);

  return {
    visitorId: visitorOk ? rawVisitor : randomToken(),
    sessionId: sessionOk ? rawSession : randomToken(),
    isNewVisitor: !visitorOk,
    isNewSession: !sessionOk,
  };
}
