"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";
import { msgCopy } from "@/lib/content/messaging";

type Feedback = "idle" | "ok" | "fail" | "limited" | "invalid";

/**
 * Real, submittable contact form for /support. All copy comes from the
 * five-language messaging dictionary and follows the active language
 * reactively via useLanguage(). The honeypot field is hidden from humans.
 */
export function SupportForm() {
  const { lang } = useLanguage();
  const c = msgCopy(lang);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback("idle");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message, company, lang }),
      });
      if (res.ok) {
        setFeedback("ok");
        setSubject("");
        setMessage("");
      } else if (res.status === 429) {
        setFeedback("limited");
      } else if (res.status === 400) {
        setFeedback("invalid");
      } else {
        setFeedback("fail");
      }
    } catch {
      setFeedback("fail");
    } finally {
      setBusy(false);
    }
  }

  const messages: Record<Feedback, string> = {
    idle: "",
    ok: c["support.ok"],
    fail: c["support.fail"],
    limited: c["support.limited"],
    invalid: c["support.invalid"],
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <label htmlFor="sk-support-email" className="mb-1 block text-sm font-medium">
          {c["support.email"]}
        </label>
        <input
          id="sk-support-email"
          type="email"
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={c["support.email"]}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="sk-support-subject" className="mb-1 block text-sm font-medium">
          {c["support.subject"]}
        </label>
        <input
          id="sk-support-subject"
          type="text"
          required
          minLength={3}
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={c["support.subject"]}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="sk-support-message" className="mb-1 block text-sm font-medium">
          {c["support.message"]}
        </label>
        <textarea
          id="sk-support-message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={c["support.message"]}
          className="input min-h-[140px] resize-y"
        />
      </div>

      {/* Honeypot: visually hidden, off-screen, no label. Bots fill it. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label htmlFor="sk-support-company">Company</label>
        <input
          id="sk-support-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-solid w-full" disabled={busy}>
        {busy ? c["support.submitting"] : c["support.submit"]}
      </button>

      {feedback !== "idle" && (
        <p
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            feedback === "ok"
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-red-400/40 bg-red-400/10 text-red-400"
          }`}
        >
          {messages[feedback]}
        </p>
      )}
    </form>
  );
}
