"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

const PROVIDERS: { key: string; label: string }[] = [
  { key: "openai", label: "OpenAI" },
  { key: "openrouter", label: "OpenRouter" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "groq", label: "Groq" },
  { key: "anthropic", label: "Anthropic" },
  { key: "gemini", label: "Google Gemini" },
];

export function ChatDemo() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [provider, setProvider] = useState("openai");

  async function send() {
    if (!input.trim() || busy) return;
    setBusy(true);
    setReply("");
    setErr("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: input, provider }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "Request failed");
        setBusy(false);
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      // NDJSON events (app/api/ai/route.ts): {"type":"start"} / token / error
      // / done. Prose and machine state are finally separate channels - an
      // upstream failure surfaces as an error, not as a fake answer.
      let buf = "";
      let failed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as { type?: string; text?: string; code?: string };
            if (ev.type === "token" && ev.text) setReply((p) => p + ev.text);
            else if (ev.type === "error") {
              failed = true;
              setErr(
                ev.code === "provider_failed"
                  ? t("chatDemo.errProvider")
                  : t("chatDemo.errGeneric"),
              );
            }
          } catch {
            /* ignore malformed line */
          }
        }
      }
      if (!failed) {
        const tail = buf.trim();
        if (tail) {
          try {
            const ev = JSON.parse(tail) as { type?: string; text?: string };
            if (ev.type === "token" && ev.text) setReply((p) => p + ev.text);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      setErr("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <div className="eyebrow mb-2">{t("chatDemo.eyebrow")}</div>
      <div className="min-h-[120px] rounded-lg border border-line bg-bg p-3 text-sm text-ink-soft">
        {reply ? (
          <span className="whitespace-pre-wrap text-ink">{reply}</span>
        ) : (
          <span className="text-muted">{t("chatDemo.hint")}</span>
        )}
        {busy && <span className="ml-1 animate-pulse text-accent">▋</span>}
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <div className="mt-3 flex gap-2">
        <select
          className="input w-auto"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-label="AI provider"
        >
          {PROVIDERS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          className="input flex-1"
          placeholder={t("chatDemo.placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-solid" onClick={send} disabled={busy}>
          {busy ? "…" : t("chatDemo.send")}
        </button>
      </div>
    </div>
  );
}
