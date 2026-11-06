"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

type Citation = { id: string; title: string; excerpt: string };
type Retrieval = {
  strategy: "hybrid-rrf" | "bm25" | "vector";
  lexical: number;
  semantic: number;
  pgvector: number;
  store: "memory" | "pgvector";
  embedding: boolean;
};
type Answer = {
  answer: string;
  citations: Citation[];
  mode: "generated" | "extractive";
  retrieval?: Retrieval;
};

/** Render the answer with inline [n] citation markers highlighted. */
function highlightCitations(text: string) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      return (
        <sup
          key={i}
          className="mx-0.5 rounded bg-accent/15 px-1 align-super text-xs font-semibold text-accent"
        >
          {m[1]}
        </sup>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Collect the [n] markers actually used inside an answer string. */
function usedCitationIds(answer: string): Set<string> {
  const ids = new Set<string>();
  for (const m of answer.matchAll(/\[(\d+)\]/g)) ids.add(`[${m[1]}]`);
  return ids;
}

function retrievalLabel(r: Retrieval, t: (k: string) => string): string {
  const strategy =
    r.strategy === "hybrid-rrf"
      ? t("rag.retrieval.hybrid")
      : r.strategy === "vector"
        ? t("rag.retrieval.vector")
        : t("rag.retrieval.bm25");
  const store =
    r.store === "pgvector"
      ? t("rag.retrieval.store.pgvector")
      : t("rag.retrieval.store.memory");
  return `${strategy} · ${store} · ${r.lexical}+${r.semantic + r.pgvector}`;
}

export function RagDemo() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"ask" | "add">("ask");
  const [question, setQuestion] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // The RAG endpoints are authenticated (401 = not signed in, 402 = no
  // subscription). Those are expected states, not crashes: we degrade to a
  // "sign in / see plans" panel instead of dumping a raw HTTP error.
  const [auth, setAuth] = useState<"login" | "subscribe" | null>(null);

  /** Map an auth failure onto the panel; returns true when it handled it. */
  function handleAuthStatus(status: number): boolean {
    if (status === 401) {
      setAuth("login");
      return true;
    }
    if (status === 402) {
      setAuth("subscribe");
      return true;
    }
    return false;
  }

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    setAuth(null);
    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthStatus(res.status)) return;
        setError(data.error || "Query failed");
        return;
      }
      setAnswer(data as Answer);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!title.trim() || !text.trim()) return;
    setBusy(true);
    setError("");
    setAuth(null);
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (handleAuthStatus(res.status)) return;
        setError(data.error || "Ingest failed");
        return;
      }
      setNotice(
        `${t("rag.added")} ${data.document.chunks} chunks · ${data.total} docs`,
      );
      setTitle("");
      setText("");
      setTab("ask");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const tabClass = (active: boolean) =>
    `min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition sm:flex-none ${
      active
        ? "bg-accent/10 text-accent"
        : "text-ink-soft hover:bg-surface hover:text-ink"
    }`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="eyebrow mb-3">RAG MODULE</div>
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("rag.title")}</h1>
      <p className="mt-3 text-ink-soft">{t("rag.subtitle")}</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={tabClass(tab === "ask")}
          onClick={() => setTab("ask")}
        >
          {t("rag.tabAsk")}
        </button>
        <button
          type="button"
          className={tabClass(tab === "add")}
          onClick={() => setTab("add")}
        >
          {t("rag.tabAdd")}
        </button>
      </div>

      {tab === "ask" ? (
        <div className="card mt-4">
          <label className="text-sm font-medium" htmlFor="rag-q">
            {t("rag.askLabel")}
          </label>
          <input
            id="rag-q"
            className="input mt-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
            placeholder={t("rag.askPlaceholder")}
          />
          <button
            type="button"
            className="btn-solid mt-3 w-full sm:w-auto"
            onClick={() => void ask()}
            disabled={busy || !question.trim()}
          >
            {busy ? t("rag.sending") : t("rag.askButton")}
          </button>
        </div>
      ) : (
        <div className="card mt-4">
          <label className="text-sm font-medium" htmlFor="rag-title">
            {t("rag.addTitleLabel")}
          </label>
          <input
            id="rag-title"
            className="input mt-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Release notes"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="rag-text">
            {t("rag.addTextLabel")}
          </label>
          <textarea
            id="rag-text"
            className="input mt-2 min-h-[140px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="btn-solid mt-3 w-full sm:w-auto"
            onClick={() => void add()}
            disabled={busy || !title.trim() || !text.trim()}
          >
            {busy ? t("rag.sending") : t("rag.addButton")}
          </button>
        </div>
      )}

      {notice && <p className="mt-4 text-sm text-accent">{notice}</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {auth && (
        <div className="card mt-4">
          <div className="eyebrow mb-2">{t("rag.auth.title")}</div>
          <p className="text-sm text-ink-soft">
            {auth === "login"
              ? t("rag.auth.loginRequired")
              : t("rag.auth.subscribeRequired")}
          </p>
          <p className="mt-2 text-xs text-muted">{t("rag.auth.demoHint")}</p>
          <Link
            href={auth === "login" ? "/login" : "/pricing"}
            className="btn-solid mt-3"
          >
            {auth === "login"
              ? t("rag.auth.loginCta")
              : t("rag.auth.subscribeCta")}
          </Link>
        </div>
      )}

      {answer && (
        <div className="mt-6 space-y-4">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="eyebrow">{t("rag.answer")}</div>
              <div className="flex flex-wrap items-center gap-2">
                {answer.retrieval && (
                  <span className="chip">
                    {retrievalLabel(answer.retrieval, t)}
                  </span>
                )}
                <span className="chip">
                  {answer.mode === "generated"
                    ? t("rag.mode.generated")
                    : t("rag.mode.extractive")}
                </span>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {highlightCitations(answer.answer)}
            </p>
          </div>

          {answer.citations.length > 0 && (
            <div>
              <div className="eyebrow mb-2">{t("rag.citations")}</div>
              <div className="space-y-2">
                {(() => {
                  const used = usedCitationIds(answer.answer);
                  return answer.citations.map((citation) => {
                    const isUsed = used.has(citation.id);
                    return (
                      <details
                        key={citation.id}
                        className={`card group ${
                          isUsed ? "border-accent/60" : ""
                        }`}
                      >
                        <summary className="flex cursor-pointer items-center gap-2 text-sm">
                          <span className="font-mono text-accent">
                            {citation.id}
                          </span>
                          <span className="font-medium">{citation.title}</span>
                          {isUsed && (
                            <span className="chip ml-auto">{t("rag.cited")}</span>
                          )}
                        </summary>
                        <p className="mt-2 break-words text-sm text-ink-soft">
                          {citation.excerpt}
                        </p>
                      </details>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
