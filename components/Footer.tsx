import Link from "next/link";
import { Trans } from "@/lib/i18n";
import { getLang, tr } from "@/lib/i18n-server";

export async function Footer() {
  const lang = await getLang();
  const year = new Date().getFullYear();
  const copyright = tr(lang, "footer.copyright").replace("{year}", String(year));
  return (
    <footer className="border-t border-line/70 mt-20">
      <div className="wrap flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-semibold text-ink">ShipKit</span> —{" "}
          <span>
            <Trans k="footer.tagline" lang={lang} />
          </span>{" "}
          <span className="font-mono">Uncorne</span>.
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/blog" className="hover:text-ink">
            <Trans k="footer.blog" lang={lang} />
          </Link>
          <Link href="/agent-ready" className="hover:text-ink">
            <Trans k="footer.agentReady" lang={lang} />
          </Link>
          <Link href="/pricing" className="hover:text-ink">
            <Trans k="footer.pricing" lang={lang} />
          </Link>
          <Link href="/login" className="hover:text-ink">
            <Trans k="footer.login" lang={lang} />
          </Link>
          <a
            href="https://github.com/uncorne/shipkit"
            className="hover:text-ink"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Trans k="footer.github" lang={lang} />
          </a>
          <Link href="/privacy" className="hover:text-ink">
            <Trans k="footer.privacy" lang={lang} />
          </Link>
          <Link href="/terms" className="hover:text-ink">
            <Trans k="footer.terms" lang={lang} />
          </Link>
        </div>
        <div>{copyright}</div>
      </div>
    </footer>
  );
}
