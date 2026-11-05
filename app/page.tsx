import Link from "next/link";
import { DemoConsole } from "@/components/DemoConsole";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

const FEATURES = [
  { k: "auth", t: "Auth", d: "Email magic-link + OAuth (Google/GitHub) via Supabase. RLS-secured by default.", p0: true },
  { k: "subs", t: "Subscriptions", d: "Stripe Checkout with a 14-day trial, webhook-synced to your database.", p0: true },
  { k: "ai", t: "One real AI feature", d: "A streaming chat endpoint behind auth + plan gating. Swap in your own prompt.", p0: true },
  { k: "db", t: "Database", d: "Postgres through Supabase, with a seeded schema and row-level security.", p0: true },
  { k: "admin", t: "Admin dashboard", d: "A signed-in area showing plan status and the live AI demo.", p0: true },
  { k: "deploy", t: "1-click deploy", d: "Vercel-ready config + a deploy button in the README.", p0: true },
  { k: "obs", t: "Observability", d: "Structured server logs and an error boundary out of the box.", p0: true },
  { k: "mt", t: "Multi-tenancy", d: "Org/scoping helpers ready to extend per-customer data.", p0: false },
  { k: "rag", t: "RAG module", d: "Working document Q&A: ingest, retrieve, cite.", p0: true },
];

export default async function HomePage() {
  const lang = await getLang();
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="wrap relative py-14 text-center sm:py-20 lg:py-24">
          <div className="eyebrow mb-4">
            <Trans k="hero.eyebrow" lang={lang} />
          </div>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl">
            <Trans k="hero.title" lang={lang} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-ink-soft">
            <Trans k="hero.subtitle" lang={lang} />
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/builder" className="btn-solid w-full sm:w-auto">
              <Trans k="hero.getStarted" lang={lang} />
            </Link>
            <Link href="/pricing" className="btn-ghost w-full sm:w-auto">
              <Trans k="hero.viewPricing" lang={lang} />
            </Link>
          </div>
          <div className="mt-6 font-mono text-xs text-muted">
            <Trans k="hero.meta" lang={lang} />
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="wrap grid items-center gap-8 py-10 sm:py-16 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="eyebrow mb-3">
            <Trans k="demo.eyebrow" lang={lang} />
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            <Trans k="demo.heading" lang={lang} />
          </h2>
          <p className="mt-4 text-ink-soft">
            <Trans k="demo.paragraph" lang={lang} />
          </p>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            <li><Trans k="demo.bullet1" lang={lang} /></li>
            <li><Trans k="demo.bullet2" lang={lang} /></li>
            <li><Trans k="demo.bullet3" lang={lang} /></li>
          </ul>
        </div>
        <DemoConsole />
      </section>

      {/* BUILDER BANNER */}
      <section className="wrap pb-4">
        <div className="card flex flex-col items-start justify-between gap-4 border-accent/40 bg-accent/5 sm:flex-row sm:items-center">
          <div>
            <div className="eyebrow mb-1">
              <Trans k="builderBanner.eyebrow" lang={lang} />
            </div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              <Trans k="builderBanner.title" lang={lang} />
            </h2>
            <p className="mt-2 max-w-xl text-ink-soft">
              <Trans k="builderBanner.body" lang={lang} />
            </p>
          </div>
          <Link href="/builder" className="btn-solid w-full whitespace-nowrap sm:w-auto">
            <Trans k="builderBanner.cta" lang={lang} />
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="wrap py-10 sm:py-16">
        <div className="eyebrow mb-3">
          <Trans k="features.eyebrow" lang={lang} />
        </div>
        <h2 className="mb-8 text-2xl font-semibold sm:text-3xl">
          <Trans k="features.heading" lang={lang} />
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.k} className="card">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold">
                  <Trans k={`feature.${f.k}`} lang={lang} />
                </h3>
                <span
                  className={`shrink-0 font-mono text-[11px] font-medium uppercase ${
                    f.p0 ? "text-accent" : "text-muted"
                  }`}
                >
                  {f.p0 ? "P0" : "P1"}
                </span>
              </div>
              <p className="text-sm text-ink-soft">
                <Trans k={`feature.${f.k}.d`} lang={lang} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="wrap py-10 text-center sm:py-16">
        <div className="card mx-auto max-w-2xl">
          <h2 className="text-xl font-semibold sm:text-2xl">
            <Trans k="cta.heading" lang={lang} />
          </h2>
          <p className="mt-3 text-ink-soft">
            <Trans k="cta.paragraph" lang={lang} />
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="btn-solid w-full sm:w-auto">
              <Trans k="cta.create" lang={lang} />
            </Link>
            <Link href="/pricing" className="btn-ghost w-full sm:w-auto">
              <Trans k="cta.compare" lang={lang} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
