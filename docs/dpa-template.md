# Data Processing Agreement — fill-in template

> This is a **template**, not legal advice and not an executed agreement. The
> operator must complete every `[BRACKET]` field, have counsel review it, and
> sign it with each sub-processor before a production launch. It is shipped as
> documentation only and is not included in customer ZIPs.

## 1. Parties

- **Controller / operator:** `[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]`,
  `[REGISTRATION NUMBER]`, contact `[PRIVACY EMAIL]`.
- **Customer / data subject:** the person using the service.
- **Effective date:** `[DATE]`. Governing law: `[JURISDICTION]`.

## 2. Subject matter and duration

Processing of account, order, license, support, telemetry and consent records
for the purpose of delivering and operating `[PRODUCT NAME]`. Duration: the
account lifetime plus the retention windows in §5.

## 3. Categories

| Category | Examples | Purpose |
|---|---|---|
| Identity | email, display name | account, license claim, support |
| Transaction | provider, order id, amount, currency, plan | billing, accounting, refunds |
| License | jti, plan, expiry, HMAC key | entitlement verification |
| Support | ticket subject/message, status | customer service |
| Telemetry | path, session/visitor hash, referrer | funnel analytics |
| Audit | consent events, delivery events, error events | compliance and incident review |

No special-category data is intentionally collected. No IP address or raw
email is stored in `delivery_events` / `consent_events` (both use SHA-256
hashes).

## 4. Sub-processors

| Provider | Role | Data | Location | Transfer safeguard |
|---|---|---|---|---|
| `[PAYMENT PROVIDER]` | checkout + webhooks | email, order, amount | `[REGION]` | `[SCC / adequacy]` |
| `[MAIL PROVIDER]` | transactional mail | email, license key | `[REGION]` | `[SCC / adequacy]` |
| `[HOSTING]` | application + database | all of §3 | `[REGION]` | `[SCC / adequacy]` |
| `[AI PROVIDER]` | optional AI features | prompt text | `[REGION]` | `[SCC / adequacy]` |
| `[ANALYTICS]` | optional, consent-gated | page/session hash | `[REGION]` | `[SCC / adequacy]` |

The operator must publish the current list, give `[NOTICE PERIOD]` days' notice
of changes, and record the acceptance in `consent_events`.

## 5. Retention and deletion

- `traffic_events`, `error_events`, `consent_events`, `delivery_events`,
  `quota`, `rate_limits`, auth tokens and non-pending outbox mail: **90 days**
  by default, enforced by `POST /api/cron/retention` (schedule it).
- `orders` and issued `licenses`: retained for accounting and for the buyer's
  existing access. An erasure replaces the email with an irreversible
  tombstone while keeping the key valid.
- `POST /api/privacy/export` produces a machine-readable copy of a subject's
  data; `POST /api/privacy/erase` anonymises it. Both require a signed-in user
  and are recorded in the consent audit log.

## 6. Security measures

HMAC-signed offline license keys, scrypt password hashes, hash-only session
tokens, httpOnly/sameSite cookies, webhook signature verification, persistent
rate limiting, same-origin checks, RLS on hosted tables. `[ADD YOUR OWN
MEASURES: encryption at rest, key rotation, access review, backups]`.

## 7. Incident notification

Processor notifies controller within `[HOURS]` hours of becoming aware of a
personal-data breach; controller notifies the supervisory authority and
subjects as required by applicable law.

## 8. Signatures

Controller: `[NAME / TITLE / DATE]`  ·  Processor: `[NAME / TITLE / DATE]`
