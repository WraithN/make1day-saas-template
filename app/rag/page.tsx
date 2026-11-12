import type { Metadata } from "next";
import { RagDemo } from "@/components/RagDemo";

// Feature demo, not a marketing page — keep it out of the index.
export const metadata: Metadata = {
  title: "RAG module demo",
  description: "Document Q&A with retrieval and citations.",
  robots: { index: false, follow: false },
};

export default function RagPage() {
  return (
    <section className="wrap py-10 sm:py-16">
      <RagDemo />

      <div className="mx-auto mt-10 max-w-3xl card">
        <div className="eyebrow mb-2">BENCHMARK</div>
        <h2 className="text-lg font-semibold">Proven retrieval quality</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Every make1day.dev RAG demo is measured against a golden question set with{" "}
          <code className="rounded bg-surface px-1">npm run rag:bench</code>. It
          posts each question to <code className="rounded bg-surface px-1">/api/rag/query</code>{" "}
          and checks whether the expected source surfaces in the top-4 citations.
          Metric: <strong>recall@4</strong> and <strong>MRR</strong>. Works with
          zero config (BM25-only).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line p-3 text-center">
            <div className="text-2xl font-semibold text-accent">100%</div>
            <div className="text-xs text-muted">recall@4</div>
          </div>
          <div className="rounded-xl border border-line p-3 text-center">
            <div className="text-2xl font-semibold text-accent">0.917</div>
            <div className="text-xs text-muted">MRR</div>
          </div>
          <div className="rounded-xl border border-line p-3 text-center">
            <div className="text-2xl font-semibold text-accent">8</div>
            <div className="text-xs text-muted">golden queries</div>
          </div>
          <div className="rounded-xl border border-line p-3 text-center">
            <div className="text-2xl font-semibold text-accent">0</div>
            <div className="text-xs text-muted">API keys needed</div>
          </div>
        </div>
        <div className="mt-4 space-y-1 text-sm">
          {[
            ["How much does make1day.dev cost?", "make1day.dev pricing"],
            ["make1day.dev 是用什么框架和语言构建的？", "技术架构 / Architecture"],
            ["How does the RAG module combine BM25 and embeddings?", "RAG module guide"],
            ["Is there a 1:1 custom development service?", "Custom services / 定制服务"],
          ].map(([q, src]) => (
            <div key={q} className="flex flex-wrap gap-2 border-b border-line/60 py-1.5">
              <span className="flex-1 text-ink-soft">{q}</span>
              <span className="chip">{src}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Measured against the seeded docs (mixed EN/ZH). Cross-lingual retrieval
          is a known limitation — golden questions are matched to their source
          language.
        </p>
      </div>
    </section>
  );
}
