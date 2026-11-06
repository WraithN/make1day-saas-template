"use client";

// Route-segment error boundary. Catches render/async errors thrown by any
// page under the root layout and shows a recoverable fallback instead of the
// default Next.js crash screen. Unexpected errors are also logged via the
// structured logger (lib/logger) on the server through the /api/health probe
// is not needed here — we log client-side to the console for triage.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability. In production this would forward
    // to your error tracker (Sentry/Datadog); here we keep it lightweight.
    // eslint-disable-next-line no-console
    console.error("Route error", error?.message, error?.digest);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="card p-8">
        <h1 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-muted">
          An unexpected error occurred while rendering this page. You can try
          again, or head back to the home page.
        </p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-xs text-muted">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-solid">
            Try again
          </button>
          <a href="/" className="btn-ghost">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
