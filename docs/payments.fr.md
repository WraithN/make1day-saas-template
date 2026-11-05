# Paiements — Guide de configuration

ShipKit intègre une couche de facturation remplaçable. Dans l'étape **Builder → 03 · Paiements**, vous choisissez un fournisseur ; l'application générée lit ce choix depuis `PAYMENT_PROVIDER` et branche le client et le gestionnaire de webhook correspondants.

Ce guide explique comment configurer chaque option pour que l'application générée puisse réellement facturer vos clients.

> Les variables d'environnement vont dans `.env.local` de l'application générée, ou dans les paramètres d'environnement de votre hébergeur (Vercel / Cloudflare Pages / votre serveur). Ne commitez jamais de secrets.

---

## 1. Stripe (prêt pour la prod)

L'option la plus mature. Gère les paiements uniques, les abonnements, la taxe et le portail client nativement.

**Étapes**

1. Créez un compte sur <https://stripe.com> et ouvrez **Developers → API keys**.
2. Copiez la **Publishable key** et la **Secret key**.
3. Créez des produits et des prix dans le **Product catalog** (ou via l'API) ; notez les Price ID à vendre.
4. Configurez le webhook : **Developers → Webhooks → Add endpoint** pointant vers
   `https://<votre-domaine>/api/webhook`. Abonnez-vous au minimum à :
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copiez le **Signing secret** (`whsec_…`).
5. (Testez d'abord) Utilisez les clés **test mode** (`sk_test_…`, `pk_test_…`) et la
   [carte de test](https://stripe.com/docs/testing) `4242 4242 4242 4242`.

**Variables d'environnement**

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Notes**
- Séparez les clés test / prod par environnement ; basculez via les variables, pas le code.
- Le portail client (annulation / changement de carte) est gratuit — activez-le dans
  **Settings → Billing → Customer portal**.

---

## 2. Creem (amical pour les indés)

Similaire à Stripe mais conçu pour les SaaS indépendants : moins de friction, TVA (MOSS) UE/UK intégrée, modèle Merchant of Record.

**Étapes**

1. Inscrivez-vous sur <https://creem.io> et ouvrez **Developers**.
2. Créez une **API key** et copiez-la.
3. Créez un **Product** dans le tableau de bord ; copiez son ID.
4. Ajoutez un endpoint webhook `https://<votre-domaine>/api/webhook` et copiez le
   **Webhook secret**. Abonnez-vous à `checkout.completed` et `subscription.paid` /
   `subscription.canceled`.

**Variables d'environnement**

```bash
PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_xxx
CREEM_WEBHOOK_SECRET=whsec_xxx
# Environnement de test Creem :
CREEM_ENV=test        # test | live
```

**Notes**
- Creem agit comme Merchant of Record et gère la TVA/GST automatiquement — une intégration fiscale séparée est souvent inutile.
- Vérifiez la signature du webhook à chaque requête.

---

## 3. PayPal (abonnements + webhooks)

Utile si votre audience préfère les portefeuilles PayPal. Utilise l'API PayPal Subscriptions.

**Étapes**

1. Créez une app développeur sur <https://developer.paypal.com> (Live ou Sandbox).
2. Copiez le **Client ID** et le **Client Secret**.
3. Créez un **Plan** dans **Subscriptions** ; copiez son ID.
4. Enregistrez un webhook : `https://<votre-domaine>/api/webhook` pour les événements
   `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
   `PAYMENT.SALE.COMPLETED`. Copiez le **Webhook ID**.

**Variables d'environnement**

```bash
PAYMENT_PROVIDER=paypal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
# false en prod, true en sandbox :
PAYPAL_ENV=sandbox    # sandbox | live
```

**Notes**
- La vérification des webhooks PayPal utilise le Webhook ID + la signature transmise ; ne la sautez pas.
- Les abonnements se renouvellent côté PayPal — votre webhook est la source de vérité pour le droit d'accès.

---

## 4. Waffo (prestataire par défaut)

Waffo désigne **deux produits incompatibles** — choisissez votre contrat.

| Saveur | Docs | Checkout | Webhook |
|---|---|---|---|
| `pancake` (défaut) | docs.waffo.ai | `POST https://api.waffo.ai/v1/actions/checkout/create-session` | `X-Waffo-Signature: t=<ms>,v1=<base64>` |
| `acquiring` | waffo.com/docs | `POST /api/v1/order/create` (payload contractuel) | `X-SIGNATURE` (base64 RSA) |

**Configuration Pancake**

1. Créez un produit **one-time** (Buyout) et un produit **mensuel** (Care).
   L'ID produit EST l'ID de prix → `WAFFO_PRICE_ID_BUYOUT` / `_CARE`.
2. Copiez le store slug dans `WAFFO_STORE_SLUG`, fixez
   `WAFFO_ENVIRONMENT=test|prod`. Pour l'auth signée RSA utilisez
   `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY` — **jamais les deux méthodes**.
3. Enregistrez l'unique webhook `POST https://<domaine>/api/webhook`, puis
   copiez les **Webhook Public Key** test ET prod dans
   `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD`.
4. `GET /api/payments/self-check` liste les réglages manquants (aucun secret).

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

Le checkout envoie `productType: "onetime" | "subscription"`, `buyerEmail`,
`metadata` (retourné dans `data.orderMetadata`) et `successUrl`. La signature
est RSA-SHA256 sur `${t}.${rawBody}` (tolérance 45 min) ;
`subscription.payment_succeeded` est ignoré car `subscription.activated`
accompagne déjà le premier paiement. L'ancien `WAFFO_WEBHOOK_SECRET` (HMAC)
n'est plus utilisé. Référence complète : `docs/waffo.md`.

---

## 5. Aucun paiement

Choisissez ceci pour ignorer la monétisation. L'application générée n'a ni caisse, ni webhook, ni UI de facturation —
utile pour les outils internes, les listes d'attente ou les produits gratuits. Vous pouvez basculer vers un vrai fournisseur plus tard en changeant `PAYMENT_PROVIDER` et en ajoutant les variables ci-dessus.

---

## Sécurité des webhooks (tous fournisseurs)

- Vérifiez toujours la signature avant de faire confiance à un corps de webhook.
- Renvoyez `2xx` rapidement ; faites les tâches lourdes de façon asynchrone.
- Utilisez l'unique endpoint `/api/webhook` pour tous les fournisseurs ; la route lit `PAYMENT_PROVIDER` pour choisir le vérificateur.
- En cas de fuite, rotatez les secrets.

## Checklist avant mise en prod

- [ ] Clés API de prod (hors test/sandbox) en place.
- [ ] Endpoint webhook joignable en HTTPS et vérifié.
- [ ] Au moins un produit/plan créé et son ID référencé dans la config.
- [ ] Redirection post-paiement / portail client branché.
- [ ] Stratégie fiscale décidée (Creem/MoR vs Stripe Tax vs aucune).

## Offres et Price ID

La page tarifs vend deux offres payantes — **Buyout** (paiement unique,
99 $ au lancement) et **Care** (mensuel, 9 $/mois au lancement) — ainsi qu'un
**service sur mesure 1:1** sans paiement en ligne.

- Stripe : `STRIPE_PRICE_ID_BUYOUT` (prix unique) et
  `STRIPE_PRICE_ID_CARE` (prix mensuel récurrent). Les anciens
  `STRIPE_PRICE_ID_PRO` / `_SCALE` servent de repli. Buyout utilise
  `mode: "payment"` sans essai ; Care utilise `mode: "subscription"` avec
  14 jours d'essai.
- Creem : le slot `PRO` correspond à Buyout, `SCALE` à Care. Configurez
  les produits en paiement unique / récurrent dans le tableau de bord.
- PayPal : cet adaptateur ne crée que des abonnements — utilisez Waffo ou Stripe pour
  le Buyout en paiement unique.
- Sur mesure 1:1 : renseignez `NEXT_PUBLIC_BOOKING_URL` et
  `NEXT_PUBLIC_CONTACT_EMAIL`. Le bouton ouvre le lien de réservation, ou un
  e-mail prérempli à défaut. Les devis sont toujours manuels.

---

## Notes d'implémentation (code actuel)

- **Waffo Pancake est le prestataire par défaut** (`PAYMENT_PROVIDER=waffo`,
  `WAFFO_FLAVOR=pancake`), pour ce site et le projet généré par défaut.
  Le mode `acquiring` ne couvre que la vérification des webhooks.
- Une **seule** route webhook : `POST https://<domaine>/api/webhook`.
- Vérification par **clé publique RSA**, pas HMAC. Clé absente → 400, aucun
  corps non signé n'est accepté.
- Les événements sont dédupliqués sur `(eventType, eventId)` avant toute
  attribution ; un paiement émet une clé `SK1.…`, un retry n'en émet pas de
  seconde.
- `POST /api/generate` exige une licence, un abonnement actif / une
  revendication par e-mail, ou l'essai gratuit quotidien. Définissez
  `LICENSE_SECRET` et appliquez `0003_licenses.sql` ; clés dans `/admin/licenses`.
- `GET /api/payments/self-check` renvoie l'état de config sans aucun secret.
- Une erreur de persistance renvoie 500 pour déclencher la réémission.
