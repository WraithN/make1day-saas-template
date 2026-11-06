"use client";

// Top-level error boundary. Catches errors that escape the root layout itself
// (e.g. a broken layout/global provider). Unlike error.tsx, this MUST render
// its own <html>/<body> because the root layout failed to.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0a0b0f",
          color: "#e5e7eb",
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
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>
              Service error
            </h1>
            <p style={{ marginTop: 12, fontSize: 14, opacity: 0.7 }}>
              The application hit an unexpected error. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 20,
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid #2dd4bf",
                background: "#2dd4bf",
                color: "#06231f",
                fontWeight: 600,
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
