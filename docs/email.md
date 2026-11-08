# Transactional email — marketit

This document covers **email delivery** for marketit: what the code does, what
you must configure on the DNS / provider side, and what is deliberately **not**
implemented. Read it before promising verification, password-reset or ticket
notification emails to a customer.

## 0. Honest scope (read first)

- **The code only sends mail.** It calls a transport (Resend REST, or your own
  HTTP webhook) and logs the outcome. It does **not** control whether a message
  reaches an inbox.
- **Deliverability depends on DNS, not on this repo.** SPF, DKIM, DMARC,
  dedicated sending subdomain, reverse DNS / PTR, suppression lists, bounce and
  complaint handling, warm-up and content quality are **DNS / provider-side
  work**. None of them are implemented in code here. If they are wrong, emails
  will be rejected or land in spam no matter how correct `sendMail()` is.
- **`MAIL_PROVIDER=smtp` is NOT implemented.** This repository has **no
  `nodemailer` dependency**. If you need SMTP, install `nodemailer` and
  `@types/nodemailer` yourself (`npm install nodemailer && npm install -D
  @types/nodemailer`), add a dynamic-import adapter in `lib/mail/index.ts`, and
  set the SMTP host/port/user/password env vars. `sendMail()` currently throws a
  typed `MailError("smtp_not_implemented")` for that value, and
  `GET /api/mail/self-check` reports it as a red flag. **Do not claim SMTP is
  supported until you have done that work.**
- **Working providers:** `resend` (Resend REST API), `webhook` (a configurable
  custom HTTP mailer), `none` (safe no-op — logs, never throws).
- **Resend endpoint / field names** (`POST https://api.resend.com/emails`,
  `Authorization: Bearer <key>`, `from`, `to: string[]`, `subject`, `html`,
  `text`, `reply_to`) follow Resend's public REST documentation; **verify the
  exact field names and error shapes against the current Resend docs before a
  production launch (需按服务商文档核对)**.
- The **webhook** transport's request body (`to`, `from`, `subject`, `html`,
  `text`, `replyTo`, `template`, `lang`) is marketit's own convention — your
  receiving service must accept it. There is no signature verification on that
  outbound call; use a private URL and `MAIL_WEBHOOK_TOKEN` as a bearer secret.

## 1. Environment variables

All are read lazily in `lib/env.ts` (missing values never break `next build`).

| Variable | Meaning | Required for |
|---|---|---|
| `MAIL_PROVIDER` | `resend` \| `webhook` \| `smtp`(reserved) \| `none` (default `none`) | all |
| `RESEND_API_KEY` | Resend API key (`re_…`) | `resend` |
| `MAIL_FROM` | Verified sender address, e.g. `no-reply@mail.example.com` | `resend`, `webhook` |
| `MAIL_FROM_NAME` | Display name (default `marketit`) | optional |
| `MAIL_REPLY_TO` | Reply-to address | optional |
| `MAIL_WEBHOOK_URL` | Your HTTP mailer endpoint | `webhook` |
| `MAIL_WEBHOOK_TOKEN` | Bearer token sent to that endpoint | optional |
| `MAIL_OPERATOR_EMAIL` | Inbox for "new support ticket" notices; defaults to `NEXT_PUBLIC_CONTACT_EMAIL` | optional |
| `MAIL_TOKEN_TTL_HOURS` | Lifetime of password-reset / verification links (default `24`) | optional |
| `NEXT_PUBLIC_SITE_URL` | Base URL used to build links in emails | all |

`GET /api/mail/self-check` reports **which of these are missing** and whether
the provider is `ready`. It returns **no secret values**, only names, booleans
and counts.

## 2. What the code sends

`lib/mail/index.ts` exposes:

- `sendMail({ to, subject, html, text, template, lang })` — strict; throws a
  typed `MailError` (`invalid_config` / `invalid_recipient` /
  `transport_error` / `smtp_not_implemented`) on failure, except in `none` mode.
- `sendMailSafely(...)` — best-effort; **never throws**. Used by ticket
  creation, password-reset requests and email-verification requests so a mail
  outage never turns a primary action into HTTP 500. The result records
  `delivered: true|false` and a `reason`.

`lib/mail/templates.ts` renders five templates, with copy from the five-language
dictionary `lib/content/messaging.ts` (en / zh / ja / fr / de):

| Template | When | Contents |
|---|---|---|
| `verify` | email verification | one-time link, `{hours}` expiry |
| `reset` | password reset | one-time link, `{hours}` expiry |
| `ticketUser` | a support ticket is created | acknowledgement + ticket id |
| `ticketOperator` | a support ticket is created | notification to `MAIL_OPERATOR_EMAIL` with from / subject / message / id |
| `licenseKey` | a paid webhook issues a license (or `/api/license/claim` re-sends it) | the key in both HTML and plain text, the plan, a redeem link and a short hint |

Every `{placeholder}` is HTML-escaped in the HTML part. Both `html` and `text`
parts are always produced (plain-text alternatives reduce spam scores).

**Durable retry:** `sendMailSafely()` now persists a failed send to
`mail_outbox` (`dedupeKey` prevents webhook replays from queuing duplicates)
unless the provider is `none`. `POST /api/cron/mail-outbox` retries pending rows
with backoff; `GET` returns counts. The host's scheduler must call it — there
is no in-process timer. `POST /api/cron/retention` deletes delivered / dead rows
after the retention window and never deletes pending mail.

## 3. DNS configuration checklist (this is NOT code — you must do it yourself)

This is the part that actually decides inbox placement. marketit cannot do it
from the application process; treat it as a launch runbook.

### 3.1 Dedicated sending subdomain (isolation)
- Send transactional mail from a **subdomain** such as `mail.example.com`,
  never from your naked apex domain `example.com`.
- Reason: a transactional stream that gets blocklisted must not poison your
  corporate / marketing mail reputation on the root domain.
- Keep a separate subdomain (or a different provider) for bulk marketing mail;
  never mix the two streams.

### 3.2 SPF
- Publish a TXT record on the sending domain, e.g.
  `mail.example.com. TXT "v=spf1 include:<provider-spf> ~all"`.
- Resend supplies the exact `include:` value in its domain-verification screen —
  **copy it from there (需按服务商文档核对)**; do not guess it.
- One SPF record per domain only; multiple TXT SPF records are a permanent
  error (`PermError`). Merge mechanisms into a single record.
- Keep the SPF lookup count within the DNS lookup limit (10).
- Use `-all` (hard fail) once you are sure every legitimate sender is listed;
  start with `~all` (soft fail) during rollout.

### 3.3 DKIM
- Add the provider's DKIM CNAME/TXT records (typically
  `resend._domainkey.mail.example.com` → the value shown in the dashboard).
- DKIM signs the message body and selected headers, proving the message was
  authorised by the domain and was not altered in transit.
- **需按服务商文档核对** the exact selector names and record type.
- Rotate keys if the provider instructs you to; never copy a DKIM private key
  into this repository.

### 3.4 DMARC
- Publish ` _dmarc.mail.example.com. TXT "v=DMARC1; p=none; rua=mailto:dmarc@example.com; …"` first, monitor aggregate reports, then move to `p=quarantine` and finally `p=reject`.
- DMARC requires **alignment**: the visible `From:` domain must align with the
  SPF envelope domain and/or the DKIM `d=` domain. A mismatch makes SPF/DKIM
  "pass" but DMARC "fail".
- Set `rua=` to a mailbox you actually read, and review the reports.
- Subdomain policy (`sp=`) can be used if the root domain has a stricter policy.

### 3.5 Supporting records / hygiene
- **PTR / reverse DNS**: for dedicated IPs, ask the provider; shared pools are
  handled by the provider.
- **MX** on the sending subdomain if you want replies/bounces delivered — or
  set `MAIL_REPLY_TO` to a monitored mailbox on a domain that has MX.
- **BIMI** is optional and requires a verified mark certificate; out of scope.
- **TLS**: the provider sends over TLS; ensure your webhook endpoint (if used)
  is HTTPS.
- **Custom return-path / bounce domain**: configure the provider's bounce
  domain so bounces are processed, not silently dropped.

### 3.6 Anti-spam / reputation (operational, not code)
- **Warm up** a new sending domain gradually; do not blast a cold domain.
- **Suppress** bounced and complained addresses. Resend maintains suppression
  lists — do not remove an address from suppression just to retry.
- **Honour unsubscribes** for any non-transactional mail. The four templates
  here are strictly transactional (verification, reset, ticket notices).
- **No URL shorteners, no misleading subject lines, no attachments** in these
  templates. Keep the plain-text alternative (the code does).
- **Monitor** bounce rate, complaint rate and DMARC reports. A spike means stop
  sending and investigate, not "try again harder".
- **Never put secrets in emails** and never log API keys. `lib/mail/index.ts`
  logs only recipient, subject, template and provider — check this stays true
  if you extend it.
- **Rate-limit the request endpoints** (`/api/support/tickets`,
  `/api/auth/password-reset`, `/api/auth/verify-email` already apply a simple
  per-IP / per-visitor throttle) so an attacker cannot use your mail stream to
  harass a third party.

## 4. Resend domain verification — step by step

1. Create a Resend account and obtain an API key (`re_…`). Put it in
   `RESEND_API_KEY`. **Never** commit it or expose it to the browser.
2. In Resend → **Domains → Add domain**, enter your **sending subdomain**
   (`mail.example.com`), not the apex.
3. Resend shows the DNS records to add: an SPF TXT, one or more DKIM CNAME/TXT
   records, and optionally a return-path / DMARC-related record. **Copy them
   verbatim from the dashboard (需按服务商文档核对).**
4. Add those records at your DNS host. DNS propagation can take minutes to
   hours; use `dig TXT mail.example.com` / `dig CNAME resend._domainkey…` to
   confirm.
5. Click **Verify** in Resend. Wait until the domain status is **Verified**.
6. Add a DMARC TXT record at `_dmarc.mail.example.com` (start with `p=none` and
   a `rua=` reporting address). Confirm with `dig TXT _dmarc.mail.example.com`.
7. Set `MAIL_FROM=no-reply@mail.example.com`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO`,
   `MAIL_OPERATOR_EMAIL`, `MAIL_PROVIDER=resend`, `NEXT_PUBLIC_SITE_URL`.
8. Call `GET /api/mail/self-check` — `ready` must be `true` and `warnings` empty.
9. Send a real test: create a support ticket at `/support` (two emails: one to
   the requester, one to the operator), and request a password reset at
   `/forgot-password`. Confirm both arrive **in the inbox, not spam**.
10. Inspect DMARC aggregate reports for the first days; tighten `p=` to
    `quarantine` then `reject` once SPF/DKIM alignment is consistently passing.
11. Verify SPF/DKIM/DMARC with an independent checker (e.g. mail-tester.com or
    your provider's tooling) — **do not rely only on Resend's own "verified"
    badge**, which checks records, not inbox placement.

## 5. Custom HTTP webhook provider (alternative to Resend)

Set `MAIL_PROVIDER=webhook`, `MAIL_WEBHOOK_URL=https://…`, optionally
`MAIL_WEBHOOK_TOKEN`. marketit POSTs a JSON body:

```json
{
  "to": "user@example.com",
  "from": "marketit <no-reply@mail.example.com>",
  "subject": "…",
  "html": "<!doctype html>…",
  "text": "…",
  "replyTo": "support@example.com",
  "template": "ticketUser",
  "lang": "en"
}
```

Your service is then responsible for actually sending the message **and for all
the DNS / SPF / DKIM / DMARC work in §3**. marketit treats HTTP 2xx as accepted;
a non-2xx is logged as `transport_error` and `delivered:false`. The caller's
`sendMailSafely()` then queues the message in `mail_outbox` for
`POST /api/cron/mail-outbox` to retry, so your service may still receive the
same logical message more than once once the retry runs — keep the transport
idempotent where the provider supports an idempotency key.

## 6. `MAIL_PROVIDER=none` (default)

Every call is logged with `logger.info("mail suppressed (MAIL_PROVIDER=none)")`
and returns `delivered:false`. Nothing throws, so the site stays up. This is a
**degraded** state: verification links, password resets and ticket notices do
not reach anyone. `GET /api/mail/self-check` marks it with a warning, and the
operator should treat it as red before launch.

## 7. Related code / endpoints

- `lib/mail/index.ts` — `sendMail` / `sendMailSafely`, transports.
- `lib/mail/config.ts` — provider resolution, `mailConfigStatus()`.
- `lib/mail/templates.ts` — five templates (incl. `licenseKey`).
- `lib/mail/outbox.ts` — durable retry queue, dual backend.
- `lib/license-delivery.ts` + `app/api/license/claim/route.ts` — automatic key email and self-service re-send.
- `app/api/cron/mail-outbox/route.ts` + `app/api/cron/retention/route.ts` — retry and cleanup endpoints (need a host scheduler).
- `lib/mail/types.ts` — `MailError`, `SendMailInput`, `SendMailResult`.
- `lib/content/messaging.ts` — five-language copy for templates and UI.
- `GET /api/mail/self-check` — secret-free configuration state.
- `lib/tickets.ts` + `app/api/support/tickets/*` — ticket creation sends the two
  ticket emails.
- `app/api/auth/password-reset` + `app/api/auth/verify-email` — send the reset /
  verification emails.
