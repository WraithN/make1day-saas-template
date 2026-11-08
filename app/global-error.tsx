"use client";

import { useEffect } from "react";

// Top-level error boundary. Catches errors that escape the root layout itself
// (e.g. a broken layout/global provider). Unlike error.tsx, this MUST render
// its own <html>/<body> because the root layout failed to — so the hand-drawn
// palette is inlined here instead of relying on globals.css.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The root layout failed, so this boundary must report on its own.
    void fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "error",
        message: error?.message ?? "global render error",
        digest: error?.digest,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#fff8e7",
          color: "#111111",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, textShadow: "3px 3px 0 #ffd93d" }}>
              Service error
            </h1>
            <p style={{ marginTop: 12, fontSize: 14, color: "#333333" }}>
              The application hit an unexpected error. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 20,
                padding: "10px 18px",
                borderRadius: 6,
                border: "3px solid #111111",
                boxShadow: "5px 5px 0 #111111",
                background: "#ffd93d",
                color: "#111111",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
