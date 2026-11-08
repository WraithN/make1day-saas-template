import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/i18n-server";
import { AGENT_READY } from "@/lib/content/agent-ready";

export const metadata: Metadata = {
  title: "Agent-ready SaaS starter — llms.txt, OpenAPI, MCP & AGENTS.md | make1day",
  description:
    "How AI agents discover make1day: llms.txt, llms-full.txt, OpenAPI 3.1, an MCP scaffold_project tool, and a generated ZIP with AGENTS.md, scoped rules and 12 skills.",
  keywords: [
    "agent-native starter",
    "AGENTS.md Next.js",
    "MCP scaffold_project",
    "llms-full.txt",
    "OpenAPI 3.1 SaaS starter",
    "Cursor rules starter",
    "Claude Code CLAUDE.md",
  ],
};

const MCP_EXAMPLE = `curl -s -X POST https://<domain>/api/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
        "name":"scaffold_project",
        "arguments":{"config":{"style":"candy","payment":"stripe"}}
      }}'`;

export default async function AgentReadyPage() {
  const lang = await getLang();
  const c = AGENT_READY[lang];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: c.title,
    description: c.lede,
    inLanguage: lang,
    about: [
      "Model Context Protocol",
      "llms.txt",
      "OpenAPI 3.1",
      "AGENTS.md",
      "Generative Engine Optimization",
    ],
    proficiencyLevel: "Beginner",
  };

  return (
    <section className="wrap py-12 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="eyebrow mb-4">{c.eyebrow}</p>
      <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        <span className="grad-text">{c.title}</span>
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">
        {c.lede}
      </p>

      <div className="mt-10 flex flex-wrap gap-2">
        {c.stack.map((s) => (
          <span key={s.path} className="chip">
            {s.path}
          </span>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">{c.stackTitle}</h2>
      <p className="mt-2 text-sm text-muted">{c.stackSub}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {c.stack.map((s) => (
          <div key={s.path} className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{s.name}</h3>
              <code className="font-mono text-xs text-accent">{s.path}</code>
            </div>
            <p className="mt-1 text-xs text-muted">{s.audience}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">{c.stepsTitle}</h2>
      <ol className="mt-6 space-y-3">
        {c.steps.map((s, i) => (
          <li key={i} className="card flex gap-3 p-4 text-sm leading-relaxed text-ink-soft">
            <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">{c.codeTitle}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">{c.codeHint}</p>
      <pre className="card mt-6 overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink-soft sm:text-sm">
        <code>{MCP_EXAMPLE}</code>
      </pre>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">{c.deliveryTitle}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">{c.deliverySub}</p>
      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <tbody>
            {c.delivery.map((d) => (
              <tr key={d.file} className="border-b border-line/60 last:border-0">
                <th scope="row" className="w-1/3 p-4 align-top font-mono text-xs font-medium text-accent sm:w-1/4">
                  {d.file}
                </th>
                <td className="p-4 align-top leading-relaxed text-ink-soft">{d.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">{c.limitsTitle}</h2>
      <ul className="mt-6 space-y-2">
        {c.limits.map((l, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
            <span aria-hidden className="text-muted">—</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>

      <div className="card mt-16 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">{c.ctaTitle}</h2>
        <p className="mt-2 text-sm text-ink-soft">{c.ctaText}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/builder" className="btn-solid">
            {c.ctaPrimary}
          </Link>
          <Link href="/llms-full.txt" className="btn-ghost">
            {c.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
