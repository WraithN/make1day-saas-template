# Zahlungen — Konfigurationshandbuch

marketit enthält eine austauschbare Abrechnungsschicht. Im Schritt **Builder → 03 · Zahlungen** wählst du einen Anbieter; die generierte Anwendung liest diese Wahl aus `PAYMENT_PROVIDER` und bindet den passenden Client und Webhook-Verifizierer ein.

Dieses Handbuch erklärt, wie jede Option eingerichtet wird, damit die generierte Anwendung tatsächlich Zahlungen annehmen kann.

> Umgebungsvariablen gehören in die `.env.local` der generierten Anwendung bzw. in die Umgebungseinstellungen deines Hosters (Vercel / Cloudflare Workers / eigener Server). Secrets niemals einchecken.

---

## 1. Stripe (produktionsreif)

Die ausgereifteste Option: Einmalzahlungen, Abonnements, Steuern und ein Kundenportal sind nativ vorhanden.

**Schritte**

1. Konto auf <https://stripe.com> anlegen und **Developers → API keys** öffnen.
2. **Publishable key** und **Secret key** kopieren.
3. Im **Product catalog** (oder per API) Produkte und Preise anlegen; die zu verkaufenden Price IDs notieren.
4. Webhook einrichten: **Developers → Webhooks → Add endpoint** auf
   `https://<deine-domain>/api/webhook`. Mindestens abonnieren:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Das **Signing secret** (`whsec_…`) kopieren.
5. Zunächst mit **Testmodus**-Schlüsseln (`sk_test_…`, `pk_test_…`) und der
   [Testkarte](https://stripe.com/docs/testing) `4242 4242 4242 4242` prüfen.

**Umgebungsvariablen**

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Hinweise**
- Test- und Live-Schlüssel pro Umgebung trennen; über Variablen umschalten, nicht im Code.
- Das Kundenportal (Kündigung / Kartentausch) ist kostenlos — aktivieren unter
  **Settings → Billing → Customer portal**.

---

## 2. Creem (für Indie-SaaS)

Stripe-ähnlich, aber auf Solo-Gründer zugeschnitten: weniger Reibung, EU/UK-USt (MOSS) integriert, Merchant-of-Record-Modell.

**Schritte**

1. Auf <https://creem.io> registrieren und **Developers** öffnen.
2. Einen **API key** erzeugen und kopieren.
3. Im Dashboard ein **Product** anlegen und dessen ID kopieren.
4. Webhook-Endpoint `https://<deine-domain>/api/webhook` hinzufügen und das
   **Webhook secret** kopieren. `checkout.completed` sowie `subscription.paid` /
   `subscription.canceled` abonnieren.

**Umgebungsvariablen**

```bash
PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_xxx
CREEM_WEBHOOK_SECRET=whsec_xxx
# Creem-Testumgebung:
CREEM_ENV=test        # test | live
```

**Hinweise**
- Creem ist Merchant of Record und übernimmt USt/GST automatisch — eine separate Steuerintegration ist meist unnötig.
- Die Webhook-Signatur bei **jeder** Anfrage prüfen.

---

## 3. PayPal (Abonnements + Webhooks)

Sinnvoll, wenn die Zielgruppe PayPal-Wallets bevorzugt. Nutzt die PayPal Subscriptions API.

**Schritte**

1. Auf <https://developer.paypal.com> eine Entwickler-App anlegen (Live oder Sandbox).
2. **Client ID** und **Client Secret** kopieren.
3. Unter **Subscriptions** einen **Plan** erstellen und dessen ID kopieren.
4. Webhook registrieren: `https://<deine-domain>/api/webhook` für
   `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
   `PAYMENT.SALE.COMPLETED`. Die **Webhook ID** kopieren.

**Umgebungsvariablen**

```bash
PAYMENT_PROVIDER=paypal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
# false für live, true für Sandbox:
PAYPAL_ENV=sandbox    # sandbox | live
```

**Hinweise**
- Die PayPal-Verifizierung nutzt Webhook ID + übermittelte Signatur; niemals überspringen.
- Abonnements verlängern sich auf PayPal-Seite — dein Webhook ist die Wahrheitsquelle für Zugriffsrechte.
- **Kein Kundenportal** in diesem Adapter.

---

## 4. Waffo (Standardanbieter)

„Waffo" bezeichnet **zwei inkompatible Produkte** — wähle nach deinem Vertrag.

| Variante | Docs | Checkout | Webhook |
|---|---|---|---|
| `pancake` (Standard) | docs.waffo.ai | `POST https://api.waffo.ai/v1/actions/checkout/create-session` | `X-Waffo-Signature: t=<ms>,v1=<base64>` |
| `acquiring` | waffo.com/docs | `POST /api/v1/order/create` (implementiert; Vertragsfelder über `WAFFO_ACQUIRING_*`) | `X-SIGNATURE` (base64-RSA) |

**Pancake einrichten**

1. Ein **One-time**-Produkt (Buyout) und ein **monatliches** Produkt (Care) anlegen.
   Die Produkt-ID IST die Price ID → `WAFFO_PRICE_ID_BUYOUT` / `_CARE`.
2. Den Store-Slug in `WAFFO_STORE_SLUG` eintragen und
   `WAFFO_ENVIRONMENT=test|prod` setzen. Für RSA-signierte Auth
   `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY` verwenden — **niemals beide Methoden**.
3. Den einzigen Webhook `POST https://<domain>/api/webhook` registrieren und die
   **Webhook Public Keys** für Test UND Prod in
   `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD` kopieren.
4. `GET /api/payments/self-check` listet fehlende Einstellungen (ohne Secrets).

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

Der Checkout sendet `productType: "onetime" | "subscription"`, `buyerEmail`,
`metadata` (zurück in `data.orderMetadata`) und `successUrl`. Die Signatur ist
RSA-SHA256 über `${t}.${rawBody}` (Toleranz 45 Minuten);
`subscription.payment_succeeded` wird ignoriert, weil `subscription.activated`
bereits die erste Zahlung begleitet. Das alte `WAFFO_WEBHOOK_SECRET` (HMAC)
wird nicht mehr verwendet. **Die Acquiring-Auftragserstellung ist implementiert**:
alle Felder `merchantInfo` / `userInfo` / `paymentInfo` / Auftrag stammen aus den
`WAFFO_ACQUIRING_*`-Variablen (marketit erfindet keine Werte), IDs werden zur
Laufzeit erzeugt, und Signatur-String / Antwortformat sind **mit deinem Waffo-Vertrag
abzugleichen**. Vollständige Referenz: `docs/waffo.md` §5.

---

## 5. Lemon Squeezy (MoR für digitale Produkte)

Lemon Squeezy ist Merchant of Record mit gehostetem Checkout und Kundenportal.
Der Adapter nutzt die JSON:API-REST-Endpunkte.

1. Zwei **Variants** anlegen — Buyout (Einmalzahlung) und Care (wiederkehrend) —
   und `LEMONSQUEEZY_VARIANT_ID_BUYOUT` / `LEMONSQUEEZY_VARIANT_ID_CARE` setzen.
2. `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET` und
   `LEMONSQUEEZY_STORE_ID` (für `relationships.store`) setzen.
3. Den einzigen Webhook `POST https://<domain>/api/webhook` registrieren. Der Adapter
   prüft `x-signature` (HMAC-SHA256-Hex des Raw-Body) mit einem
   **timing-safe** Vergleich (`node:crypto.timingSafeEqual`).
4. `GET /api/payments/self-check` listet fehlende `LEMONSQUEEZY_*`-Variablen.

```bash
PAYMENT_PROVIDER=lemonsqueezy
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_VARIANT_ID_BUYOUT=12345
LEMONSQUEEZY_VARIANT_ID_CARE=12345
```

`POST /v1/checkouts` legt `userId` / `plan` in `checkout_data.custom`; der
Webhook normalisiert `data.attributes` (`customer_id`, `user_email`, `status`,
`renews_at`, `product_id` / `variant_id`, `urls.customer_portal`) zu
`NormalizedSubEvent`. Das Portal ist best-effort: `GET /v1/subscriptions/{id}`
→ `data.attributes.urls.customer_portal`; bei Fehler `null` und die UI fällt
auf „Support kontaktieren" zurück.

> Mit deinem Lemon-Squeezy-Konto abgleichen: wo die `custom`-Daten im Webhook
> zurückkommen, ob `{id}` eine Customer- oder Subscription-ID ist, sowie die
> genauen Status-/Event-Namen. Best-effort-Mapping auf Basis der öffentlichen
> REST-Doku, keine end-to-end verifizierte Integration.

---

## 6. Keine Zahlungen

Damit wird Monetarisierung vollständig entfernt: Die generierte Anwendung hat
weder Checkout, noch Webhook, noch Abrechnungs-UI — geeignet für interne Tools,
Wartelisten oder kostenlose Produkte. Später über `PAYMENT_PROVIDER` und die
oben genannten Variablen nachrüstbar.

---

## Webhook-Sicherheit (alle Anbieter)

- Signatur **immer** prüfen, bevor einem Webhook-Body vertraut wird.
- Schnell `2xx` antworten; schwere Arbeiten asynchron erledigen.
- Für alle Anbieter den einzigen Endpoint `/api/webhook` nutzen; die Route liest
  `PAYMENT_PROVIDER`, um den Verifizierer zu wählen.
- Bei einem Leak Secrets rotieren.
- Signatur fehlt / ist ungültig / Body ist kaputt → **400**. Eine leere, aber gültig
  signierte Eventliste → `200 ignored` (bewusst anders als ein Verifizierungsfehler).

## Checkliste vor dem Go-live

- [ ] Live-API-Schlüssel (nicht Test/Sandbox) gesetzt.
- [ ] Webhook-Endpoint per HTTPS erreichbar und verifiziert.
- [ ] Mindestens ein Produkt/Plan angelegt und die ID in der Config hinterlegt.
- [ ] Post-Payment-Redirect / Kundenportal angeschlossen.
- [ ] Steuerstrategie entschieden (Creem/MoR vs. Stripe Tax vs. keine).
- [ ] `LICENSE_SECRET`, `CRON_SECRET`, `ADMIN_SESSION_SECRET` und ein echter
      `MAIL_PROVIDER` gesetzt; `/api/payments/self-check` meldet `ready: true`.

## Tarife und Price IDs

Die Preisseite verkauft zwei kostenpflichtige Angebote — **Buyout** (Einmalzahlung,
99 $ Einführungspreis) und **Care** (monatlich, 9 $/Monat Einführungspreis) —
sowie einen **individuellen 1:1-Service** ohne Online-Zahlung. Die Anzeigewerte
sind über `NEXT_PUBLIC_PRICE_BUYOUT_DISPLAY` / `NEXT_PUBLIC_PRICE_CARE_DISPLAY`
konfigurierbar.

- Stripe: `STRIPE_PRICE_ID_BUYOUT` (Einmalpreis) und
  `STRIPE_PRICE_ID_CARE` (monatlich wiederkehrend). Die älteren
  `STRIPE_PRICE_ID_PRO` / `_SCALE` dienen als Fallback. Buyout nutzt
  `mode: "payment"` ohne Testphase; Care `mode: "subscription"` mit 14 Tagen Test.
- Creem: Slot `PRO` entspricht Buyout, `SCALE` entspricht Care. Produkte im
  Dashboard als Einmalzahlung / wiederkehrend konfigurieren.
- PayPal: Dieser Adapter erzeugt nur Abonnements — für den Buyout als
  Einmalzahlung Waffo oder Stripe verwenden.
- Lemon Squeezy: `LEMONSQUEEZY_VARIANT_ID_BUYOUT` (Einmal-Variant) und
  `LEMONSQUEEZY_VARIANT_ID_CARE` (wiederkehrender Variant); dasselbe
  `priceForPlan()`-Mapping dient der Variant-Wahl und der Planauflösung im Webhook.
- 1:1-Service: `NEXT_PUBLIC_BOOKING_URL` und `NEXT_PUBLIC_CONTACT_EMAIL` setzen.
  Der Button öffnet den Buchungslink, sonst eine vorbefüllte E-Mail.
  Angebote bleiben manuell.

---

## Hinweise zur Implementierung (aktueller Code)

- **Waffo Pancake ist Standard** (`PAYMENT_PROVIDER=waffo`,
  `WAFFO_FLAVOR=pancake`) — für diese Site und für das Standard-ZIP.
  `PAYMENT_PROVIDER=lemonsqueezy` wird ebenfalls unterstützt (JSON:API-Checkout
  + timing-safe HMAC-Webhook + Kundenportal). Die `acquiring`-Auftragserstellung
  läuft über die Vertragsvariablen `WAFFO_ACQUIRING_*` — siehe `docs/waffo.md` §5.
- **Eine** einzige Webhook-Route: `POST https://<domain>/api/webhook`.
- Verifizierung nach Anbieter-Schema (Waffo: **RSA Public Key**;
  Lemon Squeezy / Creem / Stripe: **HMAC**). Fehlende Signatur → 400, kein
  unsignierter Body wird akzeptiert.
- Events werden vor der Rechtevergabe über `(eventType, eventId)` dedupliziert;
  fehlt die `eventId`, wird ein SHA-256-Digest des Raw-Body verwendet. Eine
  Zahlung erzeugt einen `SK1.…`-Key, ein Retry keinen zweiten.
- Der Webhook gibt den Rückgabewert von `grantLicense()` weiter und versendet
  den Key per `deliverLicenseKey()` (idempotent über `license:<jti>`).
  Fehlgeschlagene Zustellungen landen in `mail_outbox` und werden über
  `POST /api/cron/mail-outbox` erneut versucht; Gast-Checkout und abweichende
  Login-Adressen nutzen `/api/license/claim`.
- `POST /api/generate` verlangt eine Lizenz, ein aktives Abonnement oder eine
  E-Mail-Zuordnung — anonyme Besucher erhalten niemals das Quellcode-ZIP
  (der Download IST das Produkt). `POST /api/generate/preview` liefert eine
  Vorschau ohne Quellcode (Dateiinventar + Design-Tokens) mit Quota pro Besucher
  und pro Netzwerk. `LICENSE_SECRET` setzen und `0003_licenses.sql` anwenden;
  Keys unter `/admin/licenses`.
- `GET /api/payments/self-check` liefert den Konfigurationsstatus ohne Secrets.
- Ein Persistenzfehler liefert 500, damit der Anbieter den Webhook erneut sendet.
