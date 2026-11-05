import { ImageResponse } from "next/og";

export const alt = "ShipKit — AI SaaS starter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#0A0B0F",
          backgroundImage:
            "radial-gradient(900px 500px at 80% -10%, rgba(94,234,212,0.18), transparent 60%)",
          color: "#F2F4F7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 44,
            letterSpacing: "0.2em",
            color: "#5EEAD4",
            textTransform: "uppercase",
          }}
        >
          AI SaaS Starter · by Uncorne
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 120,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          Ship<span style={{ color: "#5EEAD4" }}>Kit</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 40,
            color: "#C8CFD9",
            maxWidth: 900,
          }}
        >
          Ship your AI SaaS MVP in days, not months. Pick your stack, download,
          launch.
        </div>
      </div>
    ),
    size,
  );
}
