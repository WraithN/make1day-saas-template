import { ImageResponse } from "next/og";

export const alt = "marketit — AI SaaS starter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Matches the site's C-graded hand-drawn palette. Satori only supports a
// subset of CSS, so the look is built from solid borders, colour blocks and
// rotation — no text-shadow, gradients or external fonts.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FFF8E7",
          color: "#111111",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              background: "#4ECDC4",
              border: "4px solid #111111",
              borderRadius: 6,
              padding: "10px 22px",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "0.12em",
              transform: "rotate(-2deg)",
            }}
          >
            AI SAAS STARTER · BY marketit
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 36,
            fontSize: 132,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          marketit
          <div
            style={{
              display: "flex",
              width: 74,
              height: 18,
              background: "#FFD93D",
              border: "3px solid #111111",
              marginLeft: 28,
              transform: "rotate(-6deg)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 38,
            lineHeight: 1.35,
            color: "#333333",
            maxWidth: 900,
          }}
        >
          Ship your AI SaaS MVP in days, not months. Pick your stack, download,
          launch.
        </div>

        <div
          style={{
            position: "absolute",
            right: 90,
            bottom: 80,
            display: "flex",
            gap: 18,
          }}
        >
          <div style={{ width: 42, height: 42, background: "#FFD93D", border: "4px solid #111111", transform: "rotate(12deg)" }} />
          <div style={{ width: 30, height: 30, background: "#4ECDC4", border: "4px solid #111111", transform: "rotate(-14deg)" }} />
          <div style={{ width: 24, height: 24, background: "#FF6B6B", border: "4px solid #111111", transform: "rotate(20deg)" }} />
        </div>
      </div>
    ),
    size,
  );
}
