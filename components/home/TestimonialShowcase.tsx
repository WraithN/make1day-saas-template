import { Trans } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-core";
import { TestimonialWall, type Testimonial } from "@/components/TestimonialWall";

// Sample content, clearly labelled as such below. Every generated project
// ships this same component with the same sample array — the honest demo of
// "what you get", not fake social proof.
const SAMPLES: Testimonial[] = [
  {
    quote:
      "Went from clone to first paying customer in six days. The webhook and license plumbing was already done — I only wrote the product.",
    name: "Maya K.",
    handle: "@mayabuilds",
  },
  {
    quote:
      "The generated AGENTS.md meant my coding agent understood the repo immediately. First starter where the AI needed zero hand-holding.",
    name: "Tomas R.",
    handle: "@tomasr_dev",
  },
  {
    quote:
      "Deleted whole folders I hadn't opted into and it still compiled. That alone is worth the price.",
    name: "Priya N.",
    handle: "@priyaships",
  },
  {
    quote:
      "The per-run cost ledger caught a bad prompt route that was eating a third of my AI budget.",
    name: "Jonas W.",
    handle: "@jonasw",
  },
  {
    quote:
      "Checkout, webhook, license key, download — the loop worked on the first try, in production, with a real card.",
    name: "Sam E.",
    handle: "@samsides",
  },
  {
    quote:
      "I audited the build with compliance:check before launch. It flagged a missing webhook public key in twenty seconds.",
    name: "Lena H.",
    handle: "@lenahbuilds",
  },
];

export function TestimonialShowcase({ lang }: { lang: Lang }) {
  return (
    <section className="sk-font wrap py-14 sm:py-20">
      <p className="eyebrow mb-3">
        <Trans k="home.tstars.eyebrow" lang={lang} />
      </p>
      <h2 className="max-w-3xl text-[18px] font-semibold text-ink">
        <Trans k="home.tstars.title" lang={lang} />
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
        <Trans k="home.tstars.intro" lang={lang} />
      </p>
      <div className="mt-8">
        <TestimonialWall items={SAMPLES} />
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-muted">
        <Trans k="home.tstars.sample" lang={lang} />
      </p>
    </section>
  );
}
