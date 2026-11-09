import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TopProgressBar } from "@/components/TopProgressBar";
import { CookieConsent } from "@/components/CookieConsent";
import { LanguageProvider } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { SeoLinks } from "@/components/SeoLinks";
import { Analytics } from "@/components/Analytics";
import { PageviewTracker } from "@/components/PageviewTracker";

// Deploy-time domain placeholder. Keep this literal stable: the generator's
// customerSeoLinks()/neutralizeBrand() rewrites exactly this string to
// localhost in customer ZIPs. Replace it with the real domain via env at launch.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://make1day.com";

/** Explicit mobile viewport + OS theme color (status bar / browser chrome). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "make1day — Ship your AI SaaS MVP in days, not months",
    template: "%s · make1day",
  },
  description:
    "make1day is a configurable AI SaaS starter: auth, subscriptions, a real AI feature, an admin console and a build generator. Pick your stack, download the source, launch.",
  applicationName: "make1day",
  keywords: [
    "AI SaaS starter",
    "Next.js SaaS boilerplate",
    "SaaS template",
    "Stripe Supabase starter",
    "AI MVP",
  ],
  authors: [{ name: "make1day" }],
  creator: "make1day",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "make1day",
    title: "make1day — Ship your AI SaaS MVP in days, not months",
    description:
      "A production-grade AI SaaS starter: auth, billing, DB, admin and one real AI feature. Pick your stack, download, launch.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "make1day — Ship your AI SaaS MVP in days, not months",
    description:
      "A production-grade AI SaaS starter. Pick your stack, download a buildable Next.js project, launch.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "make1day",
  url: SITE_URL,
  description:
    "make1day publishes a configurable, white-labelled AI SaaS starter and the generator that produces each customer build.",
};

const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "make1day",
  url: SITE_URL,
  inLanguage: ["en", "zh", "ja", "fr", "de"],
};

// Sets the theme class before paint to avoid a light/dark flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem('sk_theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Fonts come from the OS stack in globals.css — no external webfont
            request, so there is no FOUT/CLS and text stays pixel-crisp. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSONLD) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <LanguageProvider initialLang={lang}>
          <SeoLinks />
          <TopProgressBar />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
          <Analytics />
          <PageviewTracker />
        </LanguageProvider>
      </body>
    </html>
  );
}
