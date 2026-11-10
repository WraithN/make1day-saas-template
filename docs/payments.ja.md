# 決済 — 設定ガイド

make1day には差し替え可能な課金レイヤーが組み込まれています。**Builder → 03 · 決済** ステップでプロバイダを 1 つ選ぶと、生成されたアプリは `PAYMENT_PROVIDER` からその選択を読み込み、対応するクライアントと Webhook ハンドラを接続します。

本ガイドでは、各オプションを実際に課金できるように設定する方法を説明します。

> 環境変数は生成アプリの `.env.local`（または Vercel / Cloudflare Pages / 自前サーバーの環境設定）に記載します。シークレットをコミットしてはいけません。

---

## 1. Stripe（本番対応）

最も成熟した選択肢。一回払い、サブスクリプション、税、カスタマーポータルを標準搭載。

**手順**

1. <https://stripe.com> でアカウントを作成し、**Developers → API keys** を開く。
2. **Publishable key** と **Secret key** をコピー。
3. **Product catalog** で商品と価格を作成（または API で），価格 ID を控える。
4. Webhook を設定：**Developers → Webhooks → Add endpoint** で
   `https://<あなたのドメイン>/api/webhook` を指定。
   最低限 `checkout.session.completed`、`customer.subscription.updated`、
   `customer.subscription.deleted` を購読。 **Signing secret**（`whsec_…`）をコピー。
5. （まずはテスト）**test mode** キー（`sk_test_…`、`pk_test_…`）と
   [テストカード](https://stripe.com/docs/testing) `4242 4242 4242 4242` を使用。

**環境変数**

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**注意**
- テストと本番のキーは環境ごとに分け、環境変数で切り替える（コードは変えない）。
- カスタマーポータル（解約 / カード変更）は無料——**Settings → Billing → Customer portal** で有効化。

---

## 2. Creem（インディー向け）

Stripe 類似だがインディー SaaS 向けに構築：摩擦が低く、EU/UK の税（MOSS）を内蔵し、Merchant of Record モデルを採用。

**手順**

1. <https://creem.io> で登録し **Developers** を開く。
2. **API key** を作成してコピー。
3. ダッシュボードで **Product** を作成し ID をコピー。
4. Webhook エンドポイント `https://<あなたのドメイン>/api/webhook` を追加し、
   **Webhook secret** をコピー。`checkout.completed` と `subscription.paid` /
   `subscription.canceled` を購読。

**環境変数**

```bash
PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_xxx
CREEM_WEBHOOK_SECRET=whsec_xxx
# Creem テスト環境：
CREEM_ENV=test        # test | live
```

**注意**
- Creem は Merchant of Record として VAT/GST を自動処理——別途税統合は不要なことが多い。
- 各リクエストで Webhook 署名を検証すること。

---

## 3. PayPal（サブスクリプション + Webhook）

利用者が PayPal ウォレットを好む場合に。PayPal Subscriptions API を使用。

**手順**

1. <https://developer.paypal.com> で開発者アプリを作成（Live または Sandbox）。
2. **Client ID** と **Client Secret** をコピー。
3. **Subscriptions** で **Plan** を作成し ID をコピー。
4. Webhook を登録：`https://<あなたのドメイン>/api/webhook`，イベント
   `BILLING.SUBSCRIPTION.ACTIVATED`、`BILLING.SUBSCRIPTION.CANCELLED`、
   `PAYMENT.SALE.COMPLETED` を購読。**Webhook ID** をコピー。

**環境変数**

```bash
PAYMENT_PROVIDER=paypal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
# 本番は false、サンドボックスは true：
PAYPAL_ENV=sandbox    # sandbox | live
```

**注意**
- PayPal Webhook 検証は Webhook ID + 送信署名を使用，省略しないこと。
- サブスクリプションは PayPal 側で更新される——Webhook が権利（entitlement）の正確な情報源。

---

## 4. Waffo（デフォルト）

Waffo には**互換性のない 2 製品**があります。契約中のものを選んでください。

| フレーバー | ドキュメント | チェックアウト | Webhook |
|---|---|---|---|
| `pancake`（既定） | docs.waffo.ai | `POST https://api.waffo.ai/v1/actions/checkout/create-session` | `X-Waffo-Signature: t=<ms>,v1=<base64>` |
| `acquiring` | waffo.com/docs | `POST /api/v1/order/create`（実装済み；契約項目は `WAFFO_ACQUIRING_*` env から） | `X-SIGNATURE`（base64 RSA） |

**Pancake の設定**

1. ダッシュボードで**一回払い製品**（Buyout）と**月額サブスク製品**（Care）を
   作成。製品 ID がそのまま価格 ID → `WAFFO_PRICE_ID_BUYOUT` / `_CARE`。
2. store slug を `WAFFO_STORE_SLUG` に、`WAFFO_ENVIRONMENT=test|prod` を設定。
   RSA 署名認証を使う場合は `WAFFO_MERCHANT_ID` + `WAFFO_PRIVATE_KEY`。
   **2 つの認証方式を同時に送ってはいけません。**
3. 単一の webhook `POST https://<domain>/api/webhook` を登録し、test / prod
   両方の **Webhook Public Key** を `WAFFO_WEBHOOK_PUBLIC_KEY_TEST` / `_PROD` へ。
4. `GET /api/payments/self-check` で不足設定を確認（秘密情報は返しません）。

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

チェックアウトは `productType: "onetime" | "subscription"`、`buyerEmail`、
`metadata`（`data.orderMetadata` として返却）、`successUrl` を送信します。
検証は `${t}.${rawBody}` への RSA-SHA256、許容 45 分。
`subscription.payment_succeeded` は初回支払いで `subscription.activated` と
併発するため意図的に無視します。旧 `WAFFO_WEBHOOK_SECRET`（HMAC）は未使用。
**Acquiring の order/create は実装済み**：`merchantInfo` / `userInfo` /
`paymentInfo` / 注文項目はすべて `WAFFO_ACQUIRING_*` 環境変数から取得し
（make1day は値を捏造しません）、ID は実行時生成、署名文字列とレスポンス形状は
**ご自身の Waffo 契約で要確認**。詳細は `docs/waffo.md` §5。

---

## 5. Lemon Squeezy（デジタル製品向け MoR）

Lemon Squeezy はホステッド決済とカスタマーポータルを備えた MoR です。
アダプタは JSON:API REST エンドポイントを使用します。

1. 2 つの **variant**（一度きりの Buyout と定期の Care）を作成し、
   `LEMONSQUEEZY_VARIANT_ID_BUYOUT` / `LEMONSQUEEZY_VARIANT_ID_CARE` を設定。
2. `LEMONSQUEEZY_API_KEY`、`LEMONSQUEEZY_WEBHOOK_SECRET`、
   `LEMONSQUEEZY_STORE_ID`（`relationships.store` 用）を設定。
3. 単一 Webhook `POST https://<ドメイン>/api/webhook` を登録。`x-signature`
   （raw body の hex HMAC-SHA256）を **timing-safe** 比較
   （`node:crypto.timingSafeEqual`）で検証します。
4. `GET /api/payments/self-check` が不足している `LEMONSQUEEZY_*` を列挙します。

```bash
PAYMENT_PROVIDER=lemonsqueezy
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_VARIANT_ID_BUYOUT=12345
LEMONSQUEEZY_VARIANT_ID_CARE=12345
```

`POST /v1/checkouts` は `checkout_data.custom` に `userId` / `plan` を格納し、
Webhook は `data.attributes`（`customer_id`、`user_email`、`status`、`renews_at`、
`product_id` / `variant_id`、`urls.customer_portal`）を `NormalizedSubEvent` に
正規化します。ポータルは best-effort：`GET /v1/subscriptions/{id}` →
`data.attributes.urls.customer_portal`、取得できない場合は `null` を返し UI は
「サポートに連絡」にフォールバックします。

> ご自身の Lemon Squeezy アカウントで要確認：`custom` データが Webhook の
> どこに返るか、`{id}` が customer id か subscription id か、正確な
> status / event 名。公開 REST ドキュメントに基づく尽力マッピングであり、
> 検証済みのエンドツーエンド統合ではありません。

---

## 6. 決済なし

これを選ぶと収益化を完全にスキップ。生成アプリはチェックアウトも Webhook も課金 UI も持たない——
内部ツール、ウェイトリスト、無料プロダクトに便利。後から `PAYMENT_PROVIDER` を変更し環境変数を追加すれば
本番プロバイダへ切り替え可能。

---

## Webhook セキュリティ（全プロバイダ共通）

- Webhook 本文を信じる前に必ず署名を検証する。
- すぐに `2xx` を返す；重い処理は非同期で。
- プロバイダごとに独立したエンドポイントを使用（スキャフォールドは名前空間で分離済み）。
- 漏洩時はローテーションする。

## 公開チェックリスト

- [ ] 本番（テスト/サンドボックス以外）API キーが設定済み。
- [ ] Webhook エンドポイントが HTTPS で到達可能かつ検証済み。
- [ ] 少なくとも 1 つの商品/プランを作成し、設定で ID を参照。
- [ ] 決済後リダイレクト / カスタマーポータルが接続済み。
- [ ] 税方式を決定（Creem/MoR 対 Stripe Tax 対 なし）。

## プランと Price ID の対応

料金ページの有料項目は **Buyout**（一度きり、通常 $249 / ブラックフライデー $189）と
**Care**（月額、通常 $19/月 / ブラックフライデー $12/月、ビデオスタジオクレジット込み）の 2 つです。さらに **1:1 カスタム開発**
がありますが、オンライン決済はありません。Buyout には 12 か月の無料更新が含まれ、
その後は Care で更新を継続します。ライセンスは自身の製品（商用含む）の構築・運用を
許可しますが、ソースコードをテンプレートとして再販・再配布することを禁じます。
詳細は `/pricing` をご覧ください。

- Stripe：`STRIPE_PRICE_ID_BUYOUT`（一度きり）と
  `STRIPE_PRICE_ID_CARE`（月額）。旧 `STRIPE_PRICE_ID_PRO` / `_SCALE` は
  フォールバックです。Buyout はトライアルなしの `mode: "payment"`、
  Care は 14 日トライアル付きの `mode: "subscription"`。
- Creem：`PRO` スロットが Buyout、`SCALE` が Care に対応します。
  各管理画面で一度きり / 定期課金として設定してください。
- PayPal：このアダプタはサブスクリプション決済のみ対応です。一度きりの
  Buyout には Waffo または Stripe を使用してください。
- Lemon Squeezy：`LEMONSQUEEZY_VARIANT_ID_BUYOUT`（一度きり variant）と
  `LEMONSQUEEZY_VARIANT_ID_CARE`（定期 variant）。`priceForPlan()` の同じ
  マッピングが checkout の variant 選択と Webhook のプラン解決に使われます。
- 1:1 カスタム：`NEXT_PUBLIC_BOOKING_URL` と
  `NEXT_PUBLIC_CONTACT_EMAIL` を設定します。予約リンクがない場合は
  下書き入りメールにフォールバックし、見積はすべて手動です。

---

## 実装メモ（現在のコード）

- **既定の決済事業者は Waffo Pancake**（`PAYMENT_PROVIDER=waffo`、
  `WAFFO_FLAVOR=pancake`）。本サイトと Builder の既定生成プロジェクトに適用。
  `PAYMENT_PROVIDER=lemonsqueezy`（JSON:API 決済 + timing-safe HMAC Webhook +
  ポータル）にも対応。`acquiring` の order/create は `WAFFO_ACQUIRING_*`
  契約変数で実装済み（`docs/waffo.md` §5 参照）。
- Webhook は**単一**ルート `POST https://<ドメイン>/api/webhook` のみ。
- 検証は各事業者の方式に従います（Waffo：**RSA 公開鍵**；
  Lemon Squeezy / Creem / Stripe：**HMAC**）。未設定なら 400、
  未署名は受理しません。
- イベントは `(eventType, eventId)` で重複排除後に権限付与。支払い完了で
  オフライン `SK1.…` ライセンスキーを発行し、再送では二重発行しません。
- `POST /api/generate` はライセンス / 有効サブスク / メール自動認領の
  いずれかが必要。匿名ユーザーにはソース ZIP を決して渡さない（ダウンロード
  自体が商品）。匿名の場合は `POST /api/generate/preview` の**ソースなしの
  プレビュー**（ファイル一覧 + デザイントークン）を、閲覧者トークンと
  ネットワークの二重カウントでダウンロードできる。`LICENSE_SECRET` と
  `supabase/migrations/0003_licenses.sql` を設定、鍵は `/admin/licenses`。
- `GET /api/payments/self-check` は秘密情報を返さず設定不足のみ表示。
- 永続化失敗時は 500 を返し再送させます。
