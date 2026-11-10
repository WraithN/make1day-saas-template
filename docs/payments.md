# Payments — Configuration Guide

make1day ships with a pluggable billing layer. In the **Builder → 03 · Payments**
step you pick one provider; the generated scaffold reads that choice from
`PAYMENT_PROVIDER` and wires up the correct client + webhook handler.

This guide explains how to configure each option so the generated app can
actually charge customers.

> Env vars go in `.env.local` (generated app) or your host's environment
> settings (Vercel / Cloudflare Pages / your server). Never commit secrets.

---

## 1. Stripe (production-ready)

Most mature option. Supports one-time, subscriptions, tax, and the customer
portal out of the box.

**Steps**

1. Create an account at <https://stripe.com> and open **Developers → API keys**.
2. Copy the **Publishable key** and **Secret key**.
3. Create products + prices in **Product catalog** (or via the API). Note the
   Price IDs you want to sell.
4. Set up the webhook: **Developers → Webhooks → Add endpoint** pointing at
   `https://<your-domain>/api/webhook` (or whatever the scaffold exposes).
   Select at least: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy the **Signing secret** (`whsec_…`).
5. (Test first) Use **test mode** keys (`sk_test_…`, `pk_test_…`) and the
   [test card](https://stripe.com/docs/testing) `4242 4242 4242 4242`.

**Env vars**

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Notes**
- Keep test + live keys in separate environments; switch via env, not code.
- The customer portal (cancel / update card) is free — enable it under
  **Settings → Billing → Customer portal**.

---

## 2. Creem (indie-friendly)

Stripe-like but built for indie SaaS: lower friction, built-in tax (MOSS) for
EU/UK, and a clean merchant of record model.

**Steps**

1. Sign up at <https://creem.io> and open **Developers**.
2. Create an **API key** and copy it.
3. Create a **Product** in the dashboard; copy its ID.
4. Add a webhook endpoint `https://<your-domain>/api/webhook` and copy
   the **Webhook secret**. Subscribe to `checkout.completed` and
   `subscription.paid` / `subscription.canceled`.

**Env vars**

```bash
PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_xxx
CREEM_WEBHOOK_SECRET=whsec_xxx
# Creem test environment:
CREEM_ENV=test        # test | live
```

**Notes**
- Creem acts as Merchant of Record, so it handles VAT/GST for you — you usually
  don't need a separate tax integration.
- Verify webhook signature using the secret on every request.

---

## 3. PayPal (subscriptions + webhooks)

Good if your audience prefers PayPal wallets. Uses the PayPal Subscriptions API.

**Steps**

1. Create a developer app at <https://developer.paypal.com> (Live or Sandbox).
2. Copy **Client ID** and **Client Secret**.
3. In **Subscriptions**, create a **Plan** and copy its ID.
4. Register a webhook at `https://<your-domain>/api/webhook` for events
   `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
   `PAYMENT.SALE.COMPLETED`. Copy the **Webhook ID**.

**Env vars**

```bash
PAYMENT_PROVIDER=paypal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
# false for live, true for sandbox:
PAYPAL_ENV=sandbox    # sandbox | live
```

**Notes**
- PayPal webhook verification uses the Webhook ID + the transmitted signature;
  don't skip it.
- Subscriptions renew on PayPal's side — your webhook is the source of truth
  for entitlement.

---

## 4. Waffo (default gateway)

Waffo operates **two incompatible products** — pick the one your account uses.

| Flavor | Docs | Checkout | Webhook |
|---|---|---|---|
| `pancake` (default) | docs.waffo.ai | `POST https://api.waffo.ai/v1/actions/checkout/create-session` | `X-Waffo-Signature: t=<ms>,v1=<base64>` |
| `acquiring` | waffo.com/docs | `POST /api/v1/order/create` (implemented; contract fields from `WAFFO_ACQUIRING_*` env vars) | `X-SIGNATURE` (base64 RSA) |

**Pancake setup**

1. Create a **one-time** product (Buyout) and a **monthly subscription** product
   (Care) in the Dashboard. The product id IS the price id →
   `WAFFO_PRICE_ID_BUYOUT` / `WAFFO_PRICE_ID_CARE`.
2. Copy the store slug into `WAFFO_STORE_SLUG` and set
   `WAFFO_ENVIRONMENT=test|prod`. For signed server calls use
   `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY` instead — **never send both auth
   methods**.
3. Register the single webhook `POST https://<domain>/api/webhook`, then copy
   the **Webhook Public Key** for BOTH test and prod into
   `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD`.
4. Run `GET /api/payments/self-check` — it lists missing settings, no secrets.

```bash
PAYMENT_PROVIDER=waffo
WAFFO_FLAVOR=pancake
WAFFO_ENVIRONMENT=test
WAFFO_STORE_SLUG=your-store-slug
WAFFO_API_BASE=https://api.waffo.ai
WAFFO_CHECKOUT_PATH=/v1/actions/checkout/create-session
WAFFO_PRICE_ID_BUYOUT=PROD_xxx
WAFFO_PRICE_ID_CARE=PROD_xxx
WAFFO_WEBHOOK_PUBLIC_KEY_TEST="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
WAFFO_WEBHOOK_PUBLIC_KEY_PROD="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

Checkout sends `productType: "onetime" | "subscription"`, `buyerEmail`,
`metadata` (returned as `data.orderMetadata`) and `successUrl`. Webhooks are
verified with RSA-SHA256 over `${t}.${rawBody}` (45-minute tolerance);
`subscription.payment_succeeded` is deliberately ignored because Waffo also
sends `subscription.activated` for the same first payment.

`WAFFO_WEBHOOK_SECRET` (legacy HMAC) is **not used** — both Waffo products use
RSA. **Acquiring checkout is implemented**: all `merchantInfo` / `userInfo` /
`paymentInfo` / order fields come from `WAFFO_ACQUIRING_*` env vars (make1day
invents none), ids are generated at runtime, and the signing string / response
shape are **需按你的 Waffo 合同核对**. Full protocol reference: `docs/waffo.md` §5.

---

## 5. Lemon Squeezy (MoR for digital products)

Lemon Squeezy is a Merchant of Record with hosted checkouts and a customer
portal. The adapter uses its JSON:API REST endpoints.

1. Create two **variants** — a one-time Buyout variant and a recurring Care
   variant — and set `LEMONSQUEEZY_VARIANT_ID_BUYOUT` /
   `LEMONSQUEEZY_VARIANT_ID_CARE`.
2. Set `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET` and
   `LEMONSQUEEZY_STORE_ID` (used in `relationships.store`).
3. Register the single webhook `POST https://<domain>/api/webhook`. The adapter
   verifies `x-signature` as hex HMAC-SHA256 over the raw body with a
   **timing-safe** comparison (`node:crypto.timingSafeEqual`).
4. `GET /api/payments/self-check` reports any missing `LEMONSQUEEZY_*` vars.

```bash
PAYMENT_PROVIDER=lemonsqueezy
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_VARIANT_ID_BUYOUT=12345
LEMONSQUEEZY_VARIANT_ID_CARE=12345
```

`POST /v1/checkouts` sends `checkout_data.custom` with `userId` / `plan`; the
webhook normalises `data.attributes` (`customer_id`, `user_email`, `status`,
`renews_at`, `product_id` / `variant_id`, `urls.customer_portal`) into a
`NormalizedSubEvent`. The portal is best-effort: `GET /v1/subscriptions/{id}`
→ `data.attributes.urls.customer_portal`; a miss returns `null` and the UI
falls back to "contact support".

> 需按你的 Lemon Squeezy 账户核对: where `custom` data is echoed on webhook
> payloads, whether `{id}` is a customer id or a subscription id, and the exact
> status / event names. These are best-effort mappings against the public REST
> docs, not a verified end-to-end integration.

---

## 6. No payments

Select this to skip monetization entirely. The generated app has no checkout,
no webhook, and no billing UI — useful for internal tools, waitlists, or
free products. You can switch to a real provider later by changing
`PAYMENT_PROVIDER` and adding the env vars above.

---

## Webhook security (all providers)

- Always verify the signature before trusting a webhook body.
- Return `2xx` quickly; do heavy work asynchronously if needed.
- Use the SINGLE `/api/webhook` endpoint for every provider; the route reads `PAYMENT_PROVIDER` to pick the verifier.
- Rotate secrets if they ever leak.

## Going live checklist

- [ ] Live (not test/sandbox) API keys in the production environment.
- [ ] Webhook endpoint reachable over HTTPS and verified.
- [ ] At least one product/plan created and its ID referenced in config.
- [ ] A post-payment redirect / customer portal wired up.
- [ ] Tax handling decided (Creem/MoR vs Stripe Tax vs none).

## Plans and price IDs

The pricing page sells two paid items — **Buyout** (one-time, $249 regular /
$189 Black Friday) and **Care** (monthly, $19/mo regular / $12/mo Black Friday,
includes video-studio credits) — plus a **custom 1:1 service** with
no online checkout. Buyout includes 12 months of free updates; after that,
continue with Care to keep receiving updates. The license lets you build and ship
your own products (commercial use allowed) but not resell or redistribute the
source as a template. See `/pricing` for the full rules.

- Stripe: `STRIPE_PRICE_ID_BUYOUT` (one-time price) and
  `STRIPE_PRICE_ID_CARE` (recurring monthly price). The legacy
  `STRIPE_PRICE_ID_PRO` / `_SCALE` slots are fallbacks. Buyout uses
  `mode: "payment"` with no trial; Care uses `mode: "subscription"` with a
  14-day trial.
- Waffo Pancake: `WAFFO_PRICE_ID_BUYOUT` / `_CARE` are PRODUCT ids; legacy
  `WAFFO_PRICE_ID_PRO` / `_SCALE` remain as fallbacks. `createCheckout` sends
  `productType: "onetime"` for Buyout and `"subscription"` for Care.
- Creem: the `PRO` price slot maps to Buyout, `SCALE` to Care — configure them
  as one-time / recurring in the Creem dashboard.
- PayPal: this adapter creates subscription checkouts only — use Waffo or Stripe for
  one-time Buyout billing.
- Lemon Squeezy: `LEMONSQUEEZY_VARIANT_ID_BUYOUT` (one-time variant) and
  `LEMONSQUEEZY_VARIANT_ID_CARE` (recurring variant); the same `priceForPlan()`
  mapping picks the variant id for checkout and resolves the plan on webhooks.
- Custom 1:1: set `NEXT_PUBLIC_BOOKING_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`.
  The CTA opens the booking link, or a prefilled email when no link is set.
  Quotes are always manual.

---

## Content paywall (paid access)

make1day ships a **provider-agnostic content paywall**: the same entitlement check
that gates `POST /api/generate` also gates premium site content. This is a
**Builder feature** (`premium`) in generated projects, and the interception
engine is part of the core so any project can switch it on via env alone.

**Two layers, one check:**

1. **Edge interception** (`middleware.ts` → `lib/paywall.ts` `guardPremium`).
   While `LICENSE_GATE` is ON, any request to a premium route by an unentitled
   visitor is hard-redirected to `/pricing?from=<path>`. The locked body is
   never served.
2. **Component gating** (`components/Paywall`). Wrap any premium content or
   section on any page; the decision is made server-side, so the locked body is
   never sent to the client. Useful for inline premium blocks that aren't their
   own route.

**Configuration:**

- `PREMIUM_ROUTES` — comma-separated route prefixes to intercept (e.g.
  `/premium,/courses`). Defaults to `/premium`. Set to an empty string to
  disable edge interception.
- `LICENSE_GATE` — the gate that activates interception. `auto` (default)
  turns it on in **every production deployment** (fail-safe: a missing
  `LICENSE_SECRET` never opens the gate); generated projects ship with
  `LICENSE_GATE=off` unless they opt in.

**Builder feature `premium`:** selecting it ships the runnable `/premium` sample
page (`app/premium/page.tsx`) and the reusable `components/Paywall.tsx`. The
interception engine (`lib/paywall.ts`) and its middleware hook are always
present, so even a project that didn't pick the feature can protect premium
routes by setting `PREMIUM_ROUTES`.

**Entitlement (shared with the download gate):** valid offline `SK1.…` license
key, an active subscription, a license email match on a signed-in buyer, or
gate-off demo mode. See `lib/license.ts` `checkEntitlement()`. There is no
anonymous allowance for content: the free preview quota belongs to the
template generator and is **never** spent on premium content. The edge
interception only redirects visitors with no entitlement signal at all (no
license key, no Supabase session), so it never blocks a signed-in user who
might hold a subscription.

## Customer billing portal (self-serve subscription management)

Buyers can self-manage their subscription (update card, cancel, view invoices)
without operator involvement. The flow is provider-agnostic through the
`PaymentProvider.createPortalSession()` optional method:

- **Stripe** — real, via `stripe.billingPortal.sessions.create({ customer })`.
- **Creem** — best-effort via `POST /customers/{id}/portal-sessions`; wrapped in
  try/catch so a mismatched endpoint degrades to the fallback below.
- **Lemon Squeezy** — best-effort `GET /v1/subscriptions/{id}` →
  `data.attributes.urls.customer_portal`; returns `null` on a miss so the UI
  falls back to the path below. 需按你的 Lemon Squeezy 账户核对 whether `{id}`
  is a customer or subscription id.
- **PayPal / Waffo** — no self-serve portal exposed; the API returns
  `422 reason: unsupported_provider` and the UI shows a "contact support" path.

**Endpoints / UI:**

- `POST /api/billing/portal` — auth-required; looks up the caller's active
  subscription + gateway customer id and returns the hosted portal URL.
- `app/account/billing` — when the user has an active subscription, shows a
  "Manage subscription" button (`components/console/BillingPortalButton`) that
  opens the provider portal; on an unsupported provider it links to support.
- One-time **Buyout** purchases don't create a subscription row, so the portal
  button only appears for active recurring subscriptions.

**Note:** the portal is a hosted, provider-controlled page — make1day never
touches card data. After the buyer finishes, they are returned to
`/account/billing`.

## Implementation notes (current code)

- **Creem is the default gateway** (`PAYMENT_PROVIDER=creem`), for this site and
  for the Builder's default project. To switch to Waffo later, set
  `PAYMENT_PROVIDER=waffo` (with `WAFFO_FLAVOR=pancake`); the single
  `getPaymentProvider()` / `verifyWebhook` abstraction means **no code change** —
  only an env flip. `PAYMENT_PROVIDER=lemonsqueezy` is also supported (JSON:API
  checkout + timing-safe HMAC webhook + customer portal). Waffo `acquiring`
  checkout is implemented via `WAFFO_ACQUIRING_*` contract env vars — see
  `docs/waffo.md` §5.
- `app/admin/system` shows the active provider label and a one-line switch note.
- There is exactly **one** webhook route: `POST https://<domain>/api/webhook`.
  Do not register `/api/webhooks/<provider>` — those paths do not exist.
- Webhooks are verified with each gateway's own scheme (Waffo: **RSA public
  keys**; Lemon Squeezy / Creem / Stripe: **HMAC**). Missing keys cause HTTP
  400; no unsigned body is ever accepted.
- Events are deduplicated on `(eventType, eventId)` before any entitlement is
  granted. A paid event issues an offline `SK1.…` license key; retries never
  issue a second one.
- `POST /api/generate` requires a license or an active subscription/email
  claim — an anonymous visitor never receives the source ZIP (the download IS
  the product). `POST /api/generate/preview` hands out a source-free preview
  (file inventory + design tokens) under a per-visitor + per-network quota.
  Set `LICENSE_SECRET` and run `supabase/migrations/0003_licenses.sql`; inspect
  keys at `/admin/licenses`.
- `GET /api/payments/self-check` reports configuration gaps without secrets.
- Webhook persistence errors return HTTP 500 so the gateway retries — a paid
  order is never silently dropped.
