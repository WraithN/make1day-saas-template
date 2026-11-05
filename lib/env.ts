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

  // ── Payment provider (selects the active gateway) ────────────
  // ShipKit's own checkout defaults to Creem; flip PAYMENT_PROVIDER to "waffo"
  // (or stripe/paypal) to switch later without code changes — all four gateways
  // share the same unified PaymentProvider interface. Generated projects pick
  // their own gateway in the Builder; the default there mirrors this value.
  paymentProvider: () => opt("PAYMENT_PROVIDER", "creem").toLowerCase(),

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

  // ── Waffo (active gateway for ShipKit's own checkout) ────────
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
  waffoPrivateKey: () => opt("WAFFO_PRIVATE_KEY").replace(/\\n/g, "\n"),
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

  // ── AI providers ─────────────────────────────────────────────
  // Default provider used by /api/ai when none is requested.
  aiProvider: () => opt("AI_PROVIDER", "openai").toLowerCase(),

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

  // ── Site ─────────────────────────────────────────────────────
  siteUrl: () => opt("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  // ── Sales / 1:1 custom work ──────────────────────────────────
  // Booking link is optional: when empty, the pricing CTA falls back to mailto.
  bookingUrl: () => opt("NEXT_PUBLIC_BOOKING_URL"),
  contactEmail: () => opt("NEXT_PUBLIC_CONTACT_EMAIL", "hello@shipkit.dev"),

  // ── Analytics / admin ───────────────────────────────────────
  gaId: () => opt("NEXT_PUBLIC_GA_ID"),
  adminUser: () => opt("ADMIN_USER"),
  adminPassword: () => opt("ADMIN_PASSWORD"),
  // Optional comma-separated email allowlist. When set AND Supabase is
  // configured, /admin requires a signed-in user whose email is in this list
  // (in addition to the HTTP Basic Auth guard).
  adminEmails: () => opt("ADMIN_EMAILS"),

  // ── License gate (protects POST /api/generate) ──────────────
  // HMAC secret used to sign offline license keys. Required in production.
  licenseSecret: () => opt("LICENSE_SECRET"),
  // "on" | "off" | "auto" (default). auto = on only in production builds
  // with LICENSE_SECRET configured — generated customer projects therefore
  // ship with the gate OFF unless they opt in.
  licenseGateMode: () => opt("LICENSE_GATE", "auto").toLowerCase(),
  // Anonymous trial downloads per IP per UTC day. Set 0 for a hard paywall.
  freeGenerationsPerDay: () => {
    const n = Number(opt("FREE_GENERATIONS_PER_DAY", "1"));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
  },
};

/** Whether ZIP downloads require a license / entitlement. */
export function isLicenseGateEnabled(): boolean {
  const mode = env.licenseGateMode();
  if (mode === "on") return true;
  if (mode === "off") return false;
  return (
    process.env.NODE_ENV === "production" && !!process.env.LICENSE_SECRET
  );
}

/**
 * Plans sold on /pricing: "buyout" (one-time) and "care" (monthly).
 * "pro" / "scale" are the legacy price-slot names, kept so existing setups
 * keep working. For gateways without dedicated BUYOUT/CARE ids, the PRO slot
 * is the one-time Buyout product and the SCALE slot is the recurring Care plan.
 */
export type PricePlan = "buyout" | "care" | "pro" | "scale";

/** Resolve the price/plan id for a plan under the active payment provider. */
export function priceForPlan(plan: PricePlan): string | null {
  const provider = env.paymentProvider();
  const isBuyout = plan === "buyout" || plan === "pro";
  const valueOrFallback = (primary: string, fallback: string) =>
    primary || fallback || null;
  switch (provider) {
    case "creem":
      return (isBuyout ? env.creemPricePro() : env.creemPriceScale()) || null;
    case "paypal":
      return (isBuyout ? env.paypalPlanPro() : env.paypalPlanScale()) || null;
    case "waffo":
      return valueOrFallback(
        isBuyout ? env.waffoPriceBuyout() : env.waffoPriceCare(),
        isBuyout ? env.waffoPricePro() : env.waffoPriceScale(),
      );
    case "stripe":
    default:
      return valueOrFallback(
        isBuyout ? env.stripePriceBuyout() : env.stripePriceCare(),
        isBuyout ? env.stripePricePro() : env.stripePriceScale(),
      );
  }
}
