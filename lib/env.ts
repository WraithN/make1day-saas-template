// Centralised, typed access to environment variables.
// We read lazily (inside functions) so that a missing var fails at runtime
// with a clear message instead of crashing the build.

function req(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/**
 * The one public contact mailbox. Sales, operator notifications and the legal
 * notices all resolve through this helper so they can never drift apart —
 * the old privacy/terms pages hard-coded a different domain (make1day.com)
 * than the site's contact address, which is both wrong and misleading.
 */
function publicContactEmail(): string {
  // Deliberately an obvious placeholder: the brand is make1day.dev but the
  // production domain is not registered yet. Set NEXT_PUBLIC_CONTACT_EMAIL to
  // a real mailbox on your own domain before launch; never invent one here.
  return opt("NEXT_PUBLIC_CONTACT_EMAIL", "hello@example.com");
}

/**
 * Waffo Acquiring: a merchant-contract value that MUST be supplied by env.
 * We never invent one — the error names the variable and where to get it.
 * Every protocol detail here is marked "需按你的 Waffo 合同核对" in docs/waffo.md §5.
 */
function acquiringContract(name: string, where: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Waffo Acquiring: missing ${name}. ${where} Copy it from your Waffo merchant contract / integration guide (waffo.com/docs) — make1day.dev never invents contract fields. See docs/waffo.md §5.`,
    );
  }
  return v;
}

function acquiringContractJson(
  name: string,
  where: string,
): Record<string, unknown> {
  const raw = acquiringContract(name, where);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(
      `Waffo Acquiring: ${name} must be a JSON object string. ${where} See docs/waffo.md §5.`,
    );
  }
}

export const env = {
  // ── Supabase (required) ──────────────────────────────────────
  supabaseUrl: () => req("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => req("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => req("SUPABASE_SERVICE_ROLE_KEY"),

  // ── Auth / OAuth ─────────────────────────────────────────────
  // Comma-separated list of Supabase OAuth providers to show on the login page.
  // NEXT_PUBLIC_ so the client login UI can read it. Supported by Supabase:
  // google, github, apple, microsoft, gitlab, slack, …
  oauthProviders: () =>
    opt("NEXT_PUBLIC_OAUTH_PROVIDERS", "google,github,apple,microsoft")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),

  // Deployment-scoped product id for profiles.product isolation when several
  // products share one Supabase project. Defaults to 'default'; never a
  // brand string (the value lands in customer databases).
  productId: () => opt("PRODUCT_ID", "default"),

  // Workspace (multi-tenancy) UI visibility. Customer builds default ON so the
  // consoles demonstrate the org/membership scaffolding; make1day.dev's own site
  // sets SHOW_WORKSPACES=false because its licenses/orders are per-user and
  // the org UI would be a dead-end tab for buyers.
  showWorkspaces: () => opt("SHOW_WORKSPACES", "true").toLowerCase() !== "false",
  // The hosted AI video-workflow surfaces (/video gallery and /video/studio).
  // make1day.dev's OWN store sets SHOW_VIDEO_STUDIO=false: the store sells source
  // code templates, it does not operate a hosted generation entry point —
  // merchant-of-record review treats any such entry point on the selling
  // site as disqualifying, and the customer's own deployment (with its own
  // provider keys and its own processor review) is the product. Customer
  // builds default ON.
  showVideoStudio: () => opt("SHOW_VIDEO_STUDIO", "true").toLowerCase() !== "false",
  // The store's hosted AI chat / document-Q&A surfaces (/rag demo page,
  // POST /api/ai, /api/rag/*). make1day.dev's OWN store sets
  // SHOW_AI_SURFACES=false: it sells the AI feature as shipped source, it
  // does not operate hosted generation endpoints — which also keeps the
  // merchant-of-record "every AI app must wire a prompt-moderation API"
  // rule out of scope for the store itself. Customer builds default ON,
  // with the moderation gate (Creem API / Waffo Prompt Sift / local
  // blocklist) compiled into their copy.
  showAiSurfaces: () => opt("SHOW_AI_SURFACES", "true").toLowerCase() !== "false",

  // ── Payment provider (selects the active gateway) ────────────
  // Defaults to Waffo (Pancake), matching .env.example, the pricing copy and
  // the docs/waffo.md launch checklist. Flip PAYMENT_PROVIDER to creem /
  // stripe / paypal / lemonsqueezy / none to switch — all gateways share the
  // same PaymentProvider interface. Generated projects pick their own gateway
  // in the Builder; when no env is set they mirror this default.
  paymentProvider: () => opt("PAYMENT_PROVIDER", "waffo").toLowerCase(),

  // Stripe
  stripeSecretKey: () => req("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => req("STRIPE_WEBHOOK_SECRET"),
  stripePricePro: () => opt("STRIPE_PRICE_ID_PRO"),
  stripePriceScale: () => opt("STRIPE_PRICE_ID_SCALE"),
  stripePriceBuyout: () => opt("STRIPE_PRICE_ID_BUYOUT"),
  stripePriceCare: () => opt("STRIPE_PRICE_ID_CARE"),

  // Creem (Stripe-like hosted checkout + webhooks)
  creemApiKey: () => req("CREEM_API_KEY"),
  creemWebhookSecret: () => req("CREEM_WEBHOOK_SECRET"),
  creemEnv: () => opt("CREEM_ENV", "test"), // "test" | "live"
  creemPricePro: () => opt("CREEM_PRICE_ID_PRO"),
  creemPriceScale: () => opt("CREEM_PRICE_ID_SCALE"),

  // PayPal
  paypalClientId: () => req("PAYPAL_CLIENT_ID"),
  paypalClientSecret: () => req("PAYPAL_CLIENT_SECRET"),
  paypalWebhookId: () => req("PAYPAL_WEBHOOK_ID"),
  paypalEnv: () => opt("PAYPAL_ENV", "sandbox"), // "sandbox" | "live"
  paypalPlanPro: () => opt("PAYPAL_PLAN_ID_PRO"),
  paypalPlanScale: () => opt("PAYPAL_PLAN_ID_SCALE"),

  // ── Waffo (active gateway for make1day.dev's own checkout) ────────
  // IMPORTANT: "Waffo" is two different products with INCOMPATIBLE protocols.
  //   pancake   = MoR / global payments, docs.waffo.ai, @waffo/pancake-ts
  //   acquiring = SE-Asia acquiring gateway, waffo.com/docs, RSA X-SIGNATURE
  // Default is `pancake` (it matches a solo-founder digital-product business).
  waffoFlavor: () => opt("WAFFO_FLAVOR", "pancake").toLowerCase(),
  waffoEnvironment: () => opt("WAFFO_ENVIRONMENT", "test").toLowerCase(), // test | prod
  // Pancake: public Store-Slug auth (or API-Key auth when both are set).
  waffoStoreSlug: () => opt("WAFFO_STORE_SLUG"),
  waffoStoreId: () => opt("WAFFO_STORE_ID"),
  waffoMerchantId: () => opt("WAFFO_MERCHANT_ID"),
  waffoPrivateKey: () => {
    // Accept every shape the dashboard / docs hand out: multi-line PEM,
    // single-line PEM with literal \n escapes, or raw base64 without headers
    // (the API Keys download). crypto.sign needs PEM — wrap the headerless
    // case as PKCS#8 (what Pancake generates: MIIEvQ... prefix). Pure string
    // handling: lib/env is also pulled into edge middleware transitively.
    const v = opt("WAFFO_PRIVATE_KEY").replace(/\\n/g, "\n").trim();
    if (!v || v.includes("-----BEGIN")) return v;
    const body = v.replace(/\s+/g, "");
    return `-----BEGIN PRIVATE KEY-----\n${body.replace(/(.{64})/g, "$1\n")}\n-----END PRIVATE KEY-----\n`;
  },
  // Pancake webhook: platform-level RSA public keys, one per environment.
  waffoWebhookPublicKey: () =>
    opt("WAFFO_WEBHOOK_PUBLIC_KEY").replace(/\\n/g, "\n"),
  waffoWebhookPublicKeyTest: () =>
    opt("WAFFO_WEBHOOK_PUBLIC_KEY_TEST").replace(/\\n/g, "\n"),
  waffoWebhookPublicKeyProd: () =>
    opt("WAFFO_WEBHOOK_PUBLIC_KEY_PROD").replace(/\\n/g, "\n"),
  // Legacy / acquiring credentials.
  waffoApiKey: () => opt("WAFFO_API_KEY"),
  waffoWebhookSecret: () => opt("WAFFO_WEBHOOK_SECRET"),
  waffoApiBase: () =>
    opt(
      "WAFFO_API_BASE",
      opt("WAFFO_FLAVOR", "pancake").toLowerCase() === "acquiring"
        ? "https://waffo.com"
        : "https://api.waffo.ai",
    ),
  waffoCheckoutPath: () =>
    opt(
      "WAFFO_CHECKOUT_PATH",
      opt("WAFFO_FLAVOR", "pancake").toLowerCase() === "acquiring"
        ? "/api/v1/order/create"
        : "/v1/actions/checkout/create-session",
    ),
  waffoPricePro: () => opt("WAFFO_PRICE_ID_PRO"),
  waffoPriceScale: () => opt("WAFFO_PRICE_ID_SCALE"),
  waffoPriceBuyout: () => opt("WAFFO_PRICE_ID_BUYOUT"),
  waffoPriceCare: () => opt("WAFFO_PRICE_ID_CARE"),
  waffoPriceBuyoutStudio: () => opt("WAFFO_PRICE_ID_BUYOUT_STUDIO"),
  waffoPriceBuyoutStudioBf: () => opt("WAFFO_PRICE_ID_BUYOUT_STUDIO_BF"),

  // ── Black Friday campaign (reserved hook; OFF by default) ──────
  // The /black-friday page shows promo pricing + a countdown. To charge the
  // promo for real, the operator creates Black Friday products in the active
  // payment provider and sets the *_BF price ids below, then flips
  // BLACK_FRIDAY_ACTIVE. priceForPlanBf() resolves them; it returns null when
  // the campaign is off OR no BF id is set, so /pricing (which uses
  // priceForPlan, never the BF branch) is never affected.
  // Single source of truth, readable on BOTH server and client: the /black-friday
  // page (server) and the Nav link (client) must agree, so we read the
  // NEXT_PUBLIC_ variant. Default OFF — flip it to "true" to launch the promo.
  blackFridayActive: () =>
    opt("NEXT_PUBLIC_BLACK_FRIDAY_ACTIVE", "false").toLowerCase() === "true",
  // ISO-8601 timestamp the offer ends (used by the countdown). Optional.
  blackFridayEndsAt: () => opt("BLACK_FRIDAY_ENDS_AT"),
  stripePriceBuyoutBf: () => opt("STRIPE_PRICE_ID_BUYOUT_BF"),
  stripePriceCareBf: () => opt("STRIPE_PRICE_ID_CARE_BF"),
  creemPriceBuyoutBf: () => opt("CREEM_PRICE_ID_BUYOUT_BF"),
  creemPriceCareBf: () => opt("CREEM_PRICE_ID_CARE_BF"),
  waffoPriceBuyoutBf: () => opt("WAFFO_PRICE_ID_BUYOUT_BF"),
  waffoPriceCareBf: () => opt("WAFFO_PRICE_ID_CARE_BF"),
  lemonsqueezyVariantBuyoutBf: () => opt("LEMONSQUEEZY_VARIANT_BUYOUT_BF"),
  lemonsqueezyVariantCareBf: () => opt("LEMONSQUEEZY_VARIANT_CARE_BF"),
  paypalPlanBuyoutBf: () => opt("PAYPAL_PLAN_ID_BUYOUT_BF"),
  paypalPlanCareBf: () => opt("PAYPAL_PLAN_ID_CARE_BF"),

  // ── Waffo Acquiring (WAFFO_FLAVOR=acquiring) ────────────────
  // POST /api/v1/order/create needs merchant-contract fields. EVERY value
  // below comes from env (JSON string / scalar); make1day.dev invents none of them.
  // Missing → acquiringContract() throws a named, actionable error. The exact
  // field names/shapes are 需按你的 Waffo 合同核对 (docs/waffo.md §5).
  waffoAcquiringMerchantInfo: () =>
    acquiringContractJson(
      "WAFFO_ACQUIRING_MERCHANT_INFO",
      "The merchantInfo object for the create-order payload.",
    ),
  waffoAcquiringUserInfo: () =>
    acquiringContractJson(
      "WAFFO_ACQUIRING_USER_INFO",
      "The userInfo object for the create-order payload.",
    ),
  waffoAcquiringPaymentInfo: () =>
    acquiringContractJson(
      "WAFFO_ACQUIRING_PAYMENT_INFO",
      "The paymentInfo object for the create-order payload.",
    ),
  waffoAcquiringCurrency: () =>
    acquiringContract(
      "WAFFO_ACQUIRING_ORDER_CURRENCY",
      "The orderCurrency code agreed in your contract (e.g. USD).",
    ),
  waffoAcquiringOrderDescription: () =>
    acquiringContract(
      "WAFFO_ACQUIRING_ORDER_DESCRIPTION",
      "The orderDescription text agreed in your contract.",
    ),
  // The exact RSA signing string for Acquiring is NOT specified in the public
  // docs, so it is configurable instead of a hard-coded guess. "pancake"
  // (default) reuses Pancake's METHOD\nPATH\nTS\nSHA256(BODY) canonical;
  // "raw" signs the raw request body. 需按你的 Waffo 合同核对 (§5).
  waffoAcquiringSignMode: () =>
    opt("WAFFO_ACQUIRING_SIGN_MODE", "pancake").toLowerCase(),

  // ── Lemon Squeezy ───────────────────────────────────────────
  lemonsqueezyApiKey: () => req("LEMONSQUEEZY_API_KEY"),
  lemonsqueezyWebhookSecret: () => req("LEMONSQUEEZY_WEBHOOK_SECRET"),
  lemonsqueezyStoreId: () => req("LEMONSQUEEZY_STORE_ID"),
  lemonsqueezyVariantBuyout: () => opt("LEMONSQUEEZY_VARIANT_ID_BUYOUT"),
  lemonsqueezyVariantCare: () => opt("LEMONSQUEEZY_VARIANT_ID_CARE"),
  lemonsqueezyApiBase: () =>
    opt("LEMONSQUEEZY_API_BASE", "https://api.lemonsqueezy.com/v1").replace(
      /\/+$/,
      "",
    ),

  // ── AI providers ─────────────────────────────────────────────
  // Default provider used by /api/ai when none is requested.
  aiProvider: () => opt("AI_PROVIDER", "openai").toLowerCase(),

  // AI chat quota: how many AI messages a single user may send per UTC day.
  // 0 disables the AI feature entirely (every request is refused with 429).
  // The counter is keyed by the Supabase user id and resets at 00:00 UTC.
  // See lib/ai-usage.ts.
  aiMessagesPerDay: () => {
    const n = Number(opt("AI_MESSAGES_PER_DAY", "50"));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 50;
  },

  // OpenAI-compatible (OpenAI / OpenRouter / DeepSeek / Groq share the SDK)
  openaiApiKey: () => opt("OPENAI_API_KEY"),
  openaiBaseUrl: () => opt("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  openaiModel: () => opt("OPENAI_MODEL", "gpt-4o-mini"),

  openrouterApiKey: () => opt("OPENROUTER_API_KEY"),
  openrouterModel: () => opt("OPENROUTER_MODEL", "openai/gpt-4o-mini"),

  deepseekApiKey: () => opt("DEEPSEEK_API_KEY"),
  deepseekModel: () => opt("DEEPSEEK_MODEL", "deepseek-chat"),

  groqApiKey: () => opt("GROQ_API_KEY"),
  groqModel: () => opt("GROQ_MODEL", "llama-3.3-70b-versatile"),

  // Anthropic (Claude)
  anthropicApiKey: () => opt("ANTHROPIC_API_KEY"),
  anthropicModel: () => opt("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),

  // Google Gemini
  geminiApiKey: () => opt("GEMINI_API_KEY"),
  geminiModel: () => opt("GEMINI_MODEL", "gemini-1.5-flash"),

  // ── Additional OpenAI-compatible AIGC providers (builder-selectable) ──
  // Mistral AI
  mistralApiKey: () => opt("MISTRAL_API_KEY"),
  mistralBaseUrl: () => opt("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"),
  mistralModel: () => opt("MISTRAL_MODEL", "mistral-large-latest"),

  // Cohere (OpenAI-compatible chat completions)
  cohereApiKey: () => opt("COHERE_API_KEY"),
  cohereBaseUrl: () => opt("COHERE_BASE_URL", "https://api.cohere.ai/v2"),
  cohereModel: () => opt("COHERE_MODEL", "command-r-plus"),

  // xAI Grok
  xaiApiKey: () => opt("XAI_API_KEY"),
  xaiBaseUrl: () => opt("XAI_BASE_URL", "https://api.x.ai/v1"),
  xaiModel: () => opt("XAI_MODEL", "grok-2-latest"),

  // Perplexity
  perplexityApiKey: () => opt("PERPLEXITY_API_KEY"),
  perplexityBaseUrl: () => opt("PERPLEXITY_BASE_URL", "https://api.perplexity.ai"),
  perplexityModel: () => opt("PERPLEXITY_MODEL", "sonar"),

  // Ollama (self-hosted, local)
  ollamaApiKey: () => opt("OLLAMA_API_KEY"),
  ollamaBaseUrl: () => opt("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
  ollamaModel: () => opt("OLLAMA_MODEL", "llama3.1"),

  // ── RAG embeddings (hybrid retrieval, strategy B) ────────────
  // OpenAI-compatible /embeddings endpoint. Falls back to OPENAI_* so a
  // single key enables both chat and semantic retrieval.
  embeddingApiKey: () =>
    opt("EMBEDDING_API_KEY") || opt("OPENAI_API_KEY"),
  embeddingBaseUrl: () =>
    opt("EMBEDDING_BASE_URL") ||
    opt("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  embeddingModel: () =>
    opt("EMBEDDING_MODEL", "text-embedding-3-small"),
  embeddingDimensions: () => {
    const n = Number(opt("EMBEDDING_DIMENSIONS", "1536"));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1536;
  },
  // "memory" (default) keeps vectors in-process; "supabase" additionally
  // persists them to pgvector via supabase/migrations/0002_rag.sql.
  ragVectorStore: () => opt("RAG_VECTOR_STORE", "memory").toLowerCase(),
  // "on" (default) seeds a handful of neutral, config-derived demo documents
  // so the first RAG query is useful. "off" starts with an empty store.
  ragSeedDocs: () => opt("RAG_SEED_DOCS", "on").toLowerCase(),

  // ── Site ─────────────────────────────────────────────────────
  siteUrl: () => opt("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  // ── Transactional email (lib/mail/*) ─────────────────────────
  // resend  → POST https://api.resend.com/emails (REST, zero dependencies)
  // webhook → POST to MAIL_WEBHOOK_URL (custom HTTP mailer, see docs/email.md)
  // smtp    → RESERVED / NOT IMPLEMENTED. Installing nodemailer +
  //           @types/nodemailer is left to the operator; sendMail throws a
  //           clear MailError instead of pretending SMTP works.
  // none    → safe no-op: logs and returns, never throws into the caller.
  mailProvider: () => opt("MAIL_PROVIDER", "none").trim().toLowerCase(),
  resendApiKey: () => opt("RESEND_API_KEY"),
  sendgridApiKey: () => opt("SENDGRID_API_KEY"),
  postmarkServerToken: () => opt("POSTMARK_SERVER_TOKEN"),
  mailgunApiKey: () => opt("MAILGUN_API_KEY"),
  mailgunDomain: () => opt("MAILGUN_DOMAIN"),
  mailFrom: () => opt("MAIL_FROM"),
  mailFromName: () => opt("MAIL_FROM_NAME", "Support"),
  mailReplyTo: () => opt("MAIL_REPLY_TO"),
  mailWebhookUrl: () => opt("MAIL_WEBHOOK_URL"),
  mailWebhookToken: () => opt("MAIL_WEBHOOK_TOKEN"),
  // Operator inbox for "new support ticket" notifications. Falls back to the
  // public contact address so an operator is never silently left out.
  mailOperatorEmail: () =>
    opt("MAIL_OPERATOR_EMAIL") || publicContactEmail(),
  // Lifetime of password-reset / email-verification links (hours).
  mailTokenTtlHours: () => {
    const n = Number(opt("MAIL_TOKEN_TTL_HOURS", "24"));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
  },

  // ── Sales / 1:1 custom work ──────────────────────────────────
  // Booking link is optional: when empty, the pricing CTA falls back to mailto.
  bookingUrl: () => opt("NEXT_PUBLIC_BOOKING_URL"),
  contactEmail: () => publicContactEmail(),

  // ── Legal / data-controller identity ─────────────────────────
  // Single source of truth for the privacy policy, terms and contact blocks.
  // Never hard-code a company name or a mailbox in a legal page: the operator
  // fills these in before launch (see .env.example "Legal / data controller").
  // Until NEXT_PUBLIC_LEGAL_ENTITY is set, the brand name is used as a
  // placeholder — that is intentional and documented, not a real entity.
  productName: () => opt("NEXT_PUBLIC_PRODUCT_NAME", "make1day.dev"),
  legalEntity: () =>
    opt("NEXT_PUBLIC_LEGAL_ENTITY") || opt("NEXT_PUBLIC_PRODUCT_NAME", "make1day.dev"),
  legalAddress: () => opt("NEXT_PUBLIC_LEGAL_ADDRESS"),
  legalJurisdiction: () => opt("NEXT_PUBLIC_LEGAL_JURISDICTION"),
  privacyEmail: () => opt("NEXT_PUBLIC_PRIVACY_EMAIL") || publicContactEmail(),
  legalEmail: () => opt("NEXT_PUBLIC_LEGAL_EMAIL") || publicContactEmail(),
  legalUpdatedAt: () => opt("NEXT_PUBLIC_LEGAL_UPDATED", "2026-11-07"),
  dpaUrl: () => opt("NEXT_PUBLIC_DPA_URL"),

  // ── Analytics / admin ───────────────────────────────────────
  gaId: () => opt("NEXT_PUBLIC_GA_ID"),
  adminUser: () => opt("ADMIN_USER"),
  adminPassword: () => opt("ADMIN_PASSWORD"),
  // Optional comma-separated email allowlist. When set AND Supabase is
  // configured, /admin requires a signed-in user whose email is in this list
  // (in addition to the HTTP Basic Auth guard).
  adminEmails: () => opt("ADMIN_EMAILS"),

  // ── License gate (protects POST /api/generate) ──────────────
  // HMAC secret used to sign offline license keys. Required in production:
  // without it no license can be issued and the paid path stays closed.
  licenseSecret: () => opt("LICENSE_SECRET"),
  // "on" | "off" | "auto" (default).
  //   auto → ON in production, OFF in development.
  // The generated customer project ships with this rewritten to default
  // "off" (see lib/generator/prune.ts → pruneLicenseGateDefault), so a
  // customer never inherits make1day.dev's own paywall.
  licenseGateMode: () => opt("LICENSE_GATE", "auto").toLowerCase(),
  // Free PREVIEW downloads per visitor per UTC day. 0 = no anonymous
  // previews at all. Note: a preview never contains application source
  // code — see lib/generator/preview.ts.
  freeGenerationsPerDay: () => {
    const n = Number(opt("FREE_GENERATIONS_PER_DAY", "1"));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
  },
  // Free previews per network (IP) per UTC day. A visitor can always clear
  // cookies, so the IP bucket is the coarse brake that stops a single
  // machine from minting unlimited preview tokens. Defaults to 20x the
  // per-visitor limit so a shared office IP does not lock everyone out.
  freeGenerationsPerNetworkPerDay: () => {
    const raw = opt("FREE_GENERATIONS_PER_DAY_PER_IP", "");
    if (raw !== "") {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
    const perVisitor = env.freeGenerationsPerDay();
    return Math.max(perVisitor * 20, perVisitor);
  },
};

/** Whether ZIP downloads require a license / entitlement. */
export function isLicenseGateEnabled(): boolean {
  const mode = env.licenseGateMode();
  if (mode === "on") return true;
  if (mode === "off") return false;
  // "auto" is FAIL-SAFE: a production deployment always gates. A forgotten
  // LICENSE_SECRET must never silently turn the shop into a free buffet —
  // it only means no license can be *issued*, which is a configuration error
  // that /api/payments/self-check reports loudly. Development stays open so
  // the site can be worked on without a key; the generated customer project
  // ships with an explicit "off" default instead.
  return process.env.NODE_ENV === "production";
}

/** Human-readable reason behind the current gate state (self-check / admin). */
export function licenseGateStatus(): {
  mode: string;
  enabled: boolean;
  reason: string;
} {
  const mode = env.licenseGateMode();
  if (mode === "on") return { mode, enabled: true, reason: "explicit-on" };
  if (mode === "off") return { mode, enabled: false, reason: "explicit-off" };
  if (process.env.NODE_ENV === "production") {
    return { mode, enabled: true, reason: "auto-production" };
  }
  return { mode, enabled: false, reason: "auto-development" };
}

/**
 * Plans sold on /pricing: "buyout" (one-time) and "care" (monthly).
 * "pro" / "scale" are the legacy price-slot names, kept so existing setups
 * keep working. For gateways without dedicated BUYOUT/CARE ids, the PRO slot
 * is the one-time Buyout product and the SCALE slot is the recurring Care plan.
 */
export type PricePlan = "buyout" | "care" | "pro" | "scale";
/** Buyout package; a "studio" checkout resolves the STUDIO product slot. */
export type BuyoutPackage = "core" | "studio";

/** Resolve the price/plan id for a plan under the active payment provider. */
export function priceForPlan(plan: PricePlan, pkg?: BuyoutPackage): string | null {
  const provider = env.paymentProvider().split(",")[0].trim();
  const isBuyout = plan === "buyout" || plan === "pro";
  const valueOrFallback = (primary: string, fallback: string) =>
    primary || fallback || null;
  switch (provider) {
    case "creem":
      return (isBuyout ? env.creemPricePro() : env.creemPriceScale()) || null;
    case "paypal":
      return (isBuyout ? env.paypalPlanPro() : env.paypalPlanScale()) || null;
    case "waffo":
      if (isBuyout && pkg === "studio") return env.waffoPriceBuyoutStudio() || null;
      return valueOrFallback(
        isBuyout ? env.waffoPriceBuyout() : env.waffoPriceCare(),
        isBuyout ? env.waffoPricePro() : env.waffoPriceScale(),
      );
    case "lemonsqueezy":
      // Variant ids serve the same role as price ids for this gateway.
      return (
        (isBuyout
          ? env.lemonsqueezyVariantBuyout()
          : env.lemonsqueezyVariantCare()) || null
      );
    case "stripe":
    default:
      return valueOrFallback(
        isBuyout ? env.stripePriceBuyout() : env.stripePriceCare(),
        isBuyout ? env.stripePricePro() : env.stripePriceScale(),
      );
  }
}

/**
 * Black Friday price/plan id for a plan, or null when the campaign is off or no
 * BF id is configured. Mirrors priceForPlan() but reads the *_BF env vars. The
 * /black-friday page (and any checkout it starts with `blackFriday: true`)
 * uses this; /pricing never does, so its prices are untouched by the campaign.
 */
export function priceForPlanBf(plan: PricePlan, pkg?: BuyoutPackage): string | null {
  if (!env.blackFridayActive()) return null;
  const provider = env.paymentProvider().split(",")[0].trim();
  const isBuyout = plan === "buyout" || plan === "pro";
  const bf = (buyoutId: string, careId: string) =>
    (isBuyout ? buyoutId : careId) || null;
  switch (provider) {
    case "creem":
      return bf(env.creemPriceBuyoutBf(), env.creemPriceCareBf());
    case "paypal":
      return bf(env.paypalPlanBuyoutBf(), env.paypalPlanCareBf());
    case "waffo":
      if (isBuyout && pkg === "studio")
        return env.waffoPriceBuyoutStudioBf() || null;
      return bf(env.waffoPriceBuyoutBf(), env.waffoPriceCareBf());
    case "lemonsqueezy":
      return bf(env.lemonsqueezyVariantBuyoutBf(), env.lemonsqueezyVariantCareBf());
    case "stripe":
    default:
      return bf(env.stripePriceBuyoutBf(), env.stripePriceCareBf());
  }
}

/** Env vars required for Waffo Acquiring create-order (config self-check only). */
export const WAFFO_ACQUIRING_REQUIRED_VARS = [
  "WAFFO_ACQUIRING_MERCHANT_INFO",
  "WAFFO_ACQUIRING_USER_INFO",
  "WAFFO_ACQUIRING_PAYMENT_INFO",
  "WAFFO_ACQUIRING_ORDER_CURRENCY",
  "WAFFO_ACQUIRING_ORDER_DESCRIPTION",
  "WAFFO_PRIVATE_KEY",
  "WAFFO_WEBHOOK_PUBLIC_KEY",
] as const;

/** Names of missing Waffo Acquiring env vars — never throws, reads no secrets. */
export function waffoAcquiringMissing(): string[] {
  return WAFFO_ACQUIRING_REQUIRED_VARS.filter((n) => !process.env[n]?.trim());
}

/** Minimal required env vars per gateway, for /api/payments/self-check. */
export function paymentProviderRequiredVars(provider: string): string[] {
  switch (provider) {
    case "stripe":
      return ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
    case "creem":
      return ["CREEM_API_KEY", "CREEM_WEBHOOK_SECRET"];
    case "paypal":
      return [
        "PAYPAL_CLIENT_ID",
        "PAYPAL_CLIENT_SECRET",
        "PAYPAL_WEBHOOK_ID",
      ];
    case "lemonsqueezy":
      return [
        "LEMONSQUEEZY_API_KEY",
        "LEMONSQUEEZY_WEBHOOK_SECRET",
        "LEMONSQUEEZY_STORE_ID",
      ];
    default:
      return [];
  }
}

/** Names of missing required env vars for a gateway — never reads secrets. */
export function paymentProviderMissingVars(provider: string): string[] {
  return paymentProviderRequiredVars(provider).filter(
    (n) => !process.env[n]?.trim(),
  );
}

/**
 * True when the primary gateway has both its credentials AND at least one
 * product price configured. Buy buttons flip to a "coming soon" state while
 * this is false (e.g. during a Merchant-of-Record approval), and flip back
 * automatically once the env is complete — no code change at go-live.
 */
export function primaryPaymentsReady(): boolean {
  const provider = env.paymentProvider().split(",")[0].trim();
  if (paymentProviderMissingVars(provider).length > 0) return false;
  return priceForPlan("buyout") !== null || priceForPlan("care") !== null;
}

/**
 * Operator-side settings that a payment provider's own self-check cannot see.
 * These are the ones that silently break a launch when forgotten: no license
 * can be signed, admin cookies cannot be verified, cron endpoints stay closed,
 * and the legal / contact pages still show placeholders.
 */
export const OPERATOR_REQUIRED_VARS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "NEXT_PUBLIC_LEGAL_ENTITY",
  "LICENSE_SECRET",
  "ADMIN_SESSION_SECRET",
  "CRON_SECRET",
  "ADMIN_USER",
  "ADMIN_PASSWORD",
] as const;

// Values that are syntactically present but still not launch-ready. A copied
// .env.example must not make the self-check go green by accident.
const OPERATOR_PLACEHOLDERS: Record<string, string[]> = {
  NEXT_PUBLIC_SITE_URL: ["http://localhost:3000", "https://localhost:3000"],
  NEXT_PUBLIC_CONTACT_EMAIL: ["hello@example.com"],
  ADMIN_PASSWORD: ["change-me", "admin", "password"],
};

/** Missing (or still placeholder) operator settings. Never returns secrets. */
export function operatorMissingVars(): string[] {
  return OPERATOR_REQUIRED_VARS.filter((n) => {
    const value = process.env[n]?.trim().toLowerCase();
    if (!value) return true;
    return (OPERATOR_PLACEHOLDERS[n] ?? []).includes(value);
  });
}

/** Env vars required by each mail provider (for GET /api/mail/self-check). */
export function mailRequiredVars(provider: string): string[] {
  switch (provider) {
    case "resend":
      return ["RESEND_API_KEY", "MAIL_FROM"];
    case "sendgrid":
      return ["SENDGRID_API_KEY", "MAIL_FROM"];
    case "postmark":
      return ["POSTMARK_SERVER_TOKEN", "MAIL_FROM"];
    case "mailgun":
      return ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAIL_FROM"];
    case "webhook":
      return ["MAIL_WEBHOOK_URL", "MAIL_FROM"];
    case "smtp":
      // Reserved value: nodemailer is NOT a dependency of this repo. Listed so
      // the self-check can explain exactly what an operator would have to add.
      return ["nodemailer + @types/nodemailer (install manually)", "MAIL_FROM"];
    case "none":
      return [];
    default:
      return [];
  }
}

/** Names of missing required env vars for a mail provider — no secret values. */
export function mailMissingVars(provider: string): string[] {
  return mailRequiredVars(provider).filter((n) => {
    if (n.includes(" ")) return true; // the manual-install note is always "missing"
    return !process.env[n]?.trim();
  });
}
