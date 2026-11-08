// Shared guard for state-changing API routes.
//
// middleware.ts deliberately skips /api (Edge cannot reach the local DB), so
// every write route opts into this guard explicitly. It provides two things
// the app was missing: a same-origin / CSRF check and a persistent rate limit.

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/csrf";
import { consumeRateLimit, requestIdentity } from "@/lib/rate-limit";

export function hashIdentity(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export type GuardOptions = {
  /** Rule name, e.g. "license-claim". */
  bucket: string;
  limit: number;
  windowMs: number;
  /** Extra scope (hashed email, user id, …); never raw personal data. */
  identity?: string;
  /** Webhooks have no browser Origin; skip the CSRF half only for them. */
  skipCsrf?: boolean;
};

/** Returns an error response, or null when the request may proceed. */
export async function guardApiWrite(
  req: Request,
  opts: GuardOptions,
): Promise<NextResponse | null> {
  if (!opts.skipCsrf && !assertSameOrigin(req)) {
    return NextResponse.json(
      { error: "cross_site_request_rejected" },
      { status: 403 },
    );
  }
  const identity = hashIdentity(
    `${requestIdentity(req)}|${opts.identity ?? ""}`,
  );
  const result = await consumeRateLimit(opts.bucket, identity, {
    limit: opts.limit,
    windowMs: opts.windowMs,
  });
  if (!result.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: result.retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  return null;
}
