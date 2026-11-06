import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CookieConsent } from "@/components/CookieConsent";
import { LanguageProvider } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { SeoLinks } from "@/components/SeoLinks";
import { Analytics } from "@/components/Analytics";
import { PageviewTracker } from "@/components/PageviewTracker";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shipkit.dev";

/** Explicit mobile viewport + OS theme color (status bar / browser chrome). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ShipKit — Ship your AI SaaS MVP in days, not months",
    template: "%s · ShipKit",
  },
  description:
    "An AI SaaS MVP starter by Uncorne: auth, subscriptions, one real AI feature, a clean admin. Clone it, reskin it, launch.",
  applicationName: "ShipKit",
  keywords: [
    "AI SaaS starter",
    "Next.js SaaS boilerplate",
    "SaaS template",
    "Stripe Supabase starter",
    "AI MVP",
  ],
  authors: [{ name: "Uncorne" }],
  creator: "Uncorne",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ShipKit",
    title: "ShipKit — Ship your AI SaaS MVP in days, not months",
    description:
      "A production-grade AI SaaS starter: auth, billing, DB, admin and one real AI feature. Pick your stack, download, launch.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShipKit — Ship your AI SaaS MVP in days, not months",
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
  name: "Uncorne",
  url: SITE_URL,
  description:
    "Uncorne builds senior-led AI SaaS, app and agent products. ShipKit is its open AI SaaS starter.",
  sameAs: ["https://github.com/uncorne/shipkit"],
};

const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ShipKit",
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
