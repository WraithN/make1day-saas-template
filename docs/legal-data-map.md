# Legal & data map — keep the privacy policy honest

The privacy policy (`app/privacy/page.tsx`) and terms (`app/terms/page.tsx`)
used to describe a *different product* than the one running: they claimed
preferences never leave the browser, that account data lives in the buyer's
own Supabase project, and gave a `privacy@make1day.com` address that did not
match the site's contact mailbox. All three were false.

This document is the inventory those pages are written against. **If you add a
table, a cookie, a third-party call or an event field, update this file and the
privacy page in the same commit.**

## 1. One source of identity

Every entity / mailbox / domain string on the legal pages resolves through
`lib/env.ts`:

| Env var | Used for | Default |
|---|---|---|
| `NEXT_PUBLIC_PRODUCT_NAME` | Brand name in legal copy | `make1day` |
| `NEXT_PUBLIC_LEGAL_ENTITY` | Data controller / operator name | falls back to product name (**placeholder, not a legal entity**) |
| `NEXT_PUBLIC_LEGAL_ADDRESS` | Postal address (optional) | empty |
| `NEXT_PUBLIC_LEGAL_JURISDICTION` | Governing jurisdiction (optional) | empty |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public contact; fallback for both legal mailboxes | `hello@example.com` (placeholder — set a real mailbox before launch) |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | Privacy requests | falls back to contact email |
| `NEXT_PUBLIC_LEGAL_EMAIL` | Terms / refund requests | falls back to contact email |
| `NEXT_PUBLIC_SITE_URL` | Site identity, canonical URLs | `http://localhost:3000` |
| `NEXT_PUBLIC_LEGAL_UPDATED` | "Last updated" date | `2026-11-07` |
| `NEXT_PUBLIC_DPA_URL` | Link to a signed DPA (optional) | empty |

Set `NEXT_PUBLIC_LEGAL_ENTITY` to your **real registered entity** before taking
payments. Rebranding with `npm run rebrand "<Brand>" "<Owner>"` also rewrites
the product-name default, so the legal pages follow the brand automatically.

## 2. Data inventory (from `lib/sqlite.ts` / migrations)

| Store | Fields | Why | Legal basis |
|---|---|---|---|
| `localStorage` | `sk_theme`, `sk_cookie_consent`, language | preferences / consent | contract, consent |
| Cookies `sk_vid` / `sk_sid` | random opaque ids (365 d / 30 min, httpOnly, Lax) | funnel attribution | consent |
| `pageviews` | path, count, updated_at | popular pages | consent |
| `traffic_events` | visitor_id, session_id, kind (`view`/`cta`/`checkout`/`conversion`), path, label, referrer **host**, email (checkout/conversion), created_at | conversion funnel | consent / legitimate interests |
| `profiles` | email, role, display_name, full_name, company, scrypt `password_hash` + `salt`, `email_verified`, timestamps | accounts & RBAC | contract |
| `admin_users` / `admin_sessions` | username, scrypt hash, salt, session id, expiry | operator console | legitimate interests |
| `licenses` | jti, key, email, plan, order_id, created_at, expires_at | deliver / verify the paid product | contract |
| `orders` | provider, provider_order_id, email, plan, amount, currency, status, created_at | order history, accounting | contract / legal obligation |
| `webhook_events` | event_type, event_id, created_at | idempotency (Waffo retries 4×) | legitimate interests |
| `quota` | hashed network key, day, used | anonymous preview limits | legitimate interests |
| `ai_usage` | user_id, day, used | daily AI quota | contract |
| `support_tickets` | email, subject, message, status, user_id, timestamps | customer support | contract |
| `password_resets` / `email_verifications` | **SHA-256 hash** of token, email, expiry | one-time account recovery | contract |
| `local_sessions` | **SHA-256 hash** of session token, email, expiry | local password sign-in | contract |
| `mail_outbox` | recipient, subject, HTML/text body, template, status, attempts, `dedupe_key` | retry a failed transactional email (incl. the license key) | contract |
| `rate_limits` | bucket key (hashed identity or network), used, window, updated_at | cross-instance API abuse limits | legitimate interests |
| `consent_events` | **hashed** subject, kind (`accept`/`withdraw`/`export`/`erase`/`policy_view`), policy version, detail, timestamp | prove consent + data-rights requests | legal obligation |
| `delivery_events` | `jti`, **hashed** email, kind (`download`/`activate`/`key_email`/`claim_mail`), timestamp | evidence for delivery / the 14-day refund window | contract / legitimate interests |
| `error_events` | level, message, JSON context, timestamp | local error trail (also forwarded to the optional external sink) | legitimate interests |
| RAG store | ingested documents / embeddings | retrieval demo | contract |
| AI provider | chat messages (not stored locally) | generating answers | contract |

`mail_outbox` is the only table that holds a plaintext email **and** message
body (it is a queued email). It is covered by the retention job: delivered /
dead rows older than the window are deleted, pending rows are never purged.
`rate_limits` keys are hashed where an identity is available; the network
bucket uses a one-way network hash, never a raw IP.

Raw IP addresses, card numbers and user agents are **not** written to these
tables. Card data stays on the payment provider's hosted checkout. Hosting
access logs are outside this application and follow the host's own policy.

## 3. Storage location

- **No `SUPABASE_SERVICE_ROLE_KEY`** → local SQLite `.data/shipkit.db` on the
  site's own server (not the buyer's project).
- **With service-role key** → the operator's Supabase project + migrations
  `0001`–`0011`. Migration `0011` adds the delivery / governance tables and
  the atomic `consume_rate_limit()` RPC; every new table has RLS enabled.

Both backends hold the same categories. The privacy page says so explicitly.

## 4. Sub-processors (only those actually configured)

Payments (one of Stripe / Creem / PayPal / Waffo Pancake / Waffo Acquiring /
Lemon Squeezy), Supabase, AI providers (OpenAI / Anthropic / Gemini /
OpenRouter / DeepSeek / Groq), email (Resend or custom HTTP mailer; `none`
sends nothing), an optional external error sink (`ERROR_REPORT_URL` — only
error messages and structured context, never analytics identities), Google
Analytics 4 (only when `NEXT_PUBLIC_GA_ID` is set and consent was granted),
and the hosting platform.

Transfers outside the visitor's country can occur through these providers.
DPAs / standard contractual clauses are the operator's responsibility.

## 5. What now exists, and the remaining gaps

Implemented (`lib/observability.ts`, `lib/legal-lifecycle.ts`,
`lib/mail/outbox.ts`, migration `0011`):

- **Automated retention job** — `POST /api/cron/retention?days=90`, protected
  by `CRON_SECRET`. Purges traffic / error / consent / delivery events, expired
  one-time tokens and sessions, old quota + rate-limit buckets and delivered /
  dead outbox mail. `orders` and `licenses` are kept for accounting and for
  customers who already own a key; pending outbox mail is never deleted.
  **The scheduler itself is not included** — the host's cron must call this
  endpoint, otherwise nothing runs. That wiring needs a real deployment.
- **Download / activation log** — `delivery_events`, written by
  `POST /api/generate` (`download`), `POST /api/license` (`activate`),
  `deliverLicenseKey()` (`key_email`) and `/api/license/claim` (`claim_mail`).
  Email is a one-way hash. The five-language refund copy still uses a plain
  14-day window; the log is evidence, not a new refund condition.
- **Consent audit log** — `consent_events`, written by
  `POST /api/privacy/consent` (`accept`/`withdraw`/`policy_view`) and by the
  export / erase endpoints. The banner still stores the current choice in
  `localStorage`; the server log is append-only with a hashed subject.
- **Data-subject endpoints** — `POST /api/privacy/export` (returns
  `my-data.json`) and `POST /api/privacy/erase` (requires an exact
  `confirmEmail` match). Erasure keeps order / license rows and replaces the
  email with an irreversible tombstone where accounting requires the row.
- **DPA template** — `docs/dpa-template.md`. It is a fill-in template, **not a
  signed agreement and not legal advice**; `NEXT_PUBLIC_DPA_URL` must point to
  a signed copy before the privacy page links to it.
- **Transactional-email retry** — `mail_outbox` + `POST /api/cron/mail-outbox`.
  Same caveat: the retry only happens when the host's cron calls the route.

Still honest gaps:

- **No cookie scanner**, no consent-receipt UI showing the audit trail, no
  MFA / OAuth / session rotation in local-auth mode, no SMTP mail transport.
- **`ERROR_REPORT_URL` is optional.** Without it, errors only land in
  `error_events` and stdout; there is no alerting or paging.
- The repository `LICENSE` is MIT while the site sells a generated build. The
  terms explain that the charge is for the configured build + delivery service,
  and that the generator itself is not part of the ZIP. If you need to restrict
  redistribution of the generated code, that is a licensing decision that must
  be made **before** launch — MIT cannot be retro-revoked for copies already
  delivered.

## 6. Pre-launch checklist

1. Set every variable in §1, especially a real `NEXT_PUBLIC_LEGAL_ENTITY` and
   a contact mailbox on your own domain.
2. Re-read `/privacy` and `/terms` **on the deployed domain**, not just in
   source — confirm the rendered entity name, mailbox and site URL.
3. List the providers you actually enabled and sign their DPAs; remove unused
   ones from §4 of the privacy page if you want a strictly minimal notice.
4. Decide on the MIT vs commercial-license question above.
5. Configure the host's scheduler to call **both** cron endpoints with
   `Authorization: Bearer <CRON_SECRET>`:
   `POST /api/cron/retention?days=90` (daily) and
   `POST /api/cron/mail-outbox` (every 5–15 minutes). Set `CRON_SECRET` and
   verify `/api/health` reports the dependency as ready.
6. Point `NEXT_PUBLIC_DPA_URL` at a signed DPA and fill in
   `docs/dpa-template.md` with the real entity / sub-processor list.
7. Keep the refund copy in `lib/i18n-core.ts` consistent with whatever window
   you actually offer; `delivery_events` gives you the evidence if you change it.
