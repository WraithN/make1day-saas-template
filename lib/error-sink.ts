// Edge-safe external error sink. No Node built-ins and no database imports, so
// lib/logger.ts (which can run in either runtime) may use it safely.
//
// Set ERROR_REPORT_URL to any endpoint that accepts a JSON POST (Sentry relay,
// a log collector, an n8n webhook, …). ERROR_REPORT_TOKEN is sent as a bearer
// token when present. Failures are swallowed: observability must never break
// the request that produced the error.

export function forwardToSink(payload: Record<string, unknown>): void {
  const url = process.env.ERROR_REPORT_URL?.trim();
  if (!url) return;
  const token = process.env.ERROR_REPORT_TOKEN?.trim();
  try {
    void fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* sink outage must not cascade */
    });
  } catch {
    /* invalid URL / fetch unavailable */
  }
}
