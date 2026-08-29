# リリースチェックリスト

コード側の修正だけでは完結しない、**リリース前に必ず外部サービス側で実施・確認すべき項目**の一覧。
(2026-07-19 の網羅監査で洗い出したもの)

## 1. ビルド環境変数 (EAS / ローカルビルド)

- [ ] `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` を本番値で注入する
- [ ] `EXPO_PUBLIC_USE_MOCK` を **設定しない**（または `false`）— trueだとモックバックエンドで動作する
- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`（公開SDKキー）を注入する
- [ ] 必要なら `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY`

## 2. Supabase

- [ ] `supabase db push` で新規マイグレーション2本を適用する
      (`20260223000000_baseline_core_schema.sql`, `20260719120000_release_hardening.sql`)
- [ ] **本番DBで実際のRLSを確認**: `profiles` / `subscriptions` / `health_checkups` / `api_keys` —
      ベースラインはIF NOT EXISTSのため、ダッシュボードで作られた既存テーブルの列・ポリシーが
      想定と一致するか `supabase db pull` で突き合わせる
- [ ] `profiles.is_premium` がクライアントから更新できないこと（トリガー `profiles_enforce_premium_lock` の適用）を確認
- [ ] Storage: `meal-images` / `checkup-images` が **public=false** であること
- [ ] Edge Functions をデプロイ: `analyze-food-image`, `generate-meal-plan`, `health-check-advice`,
      `import-recipe`, `revenuecat-webhook`, **`barcode-lookup`(新規)**, **`delete-account`(新規)**
- [ ] Functions のシークレット設定: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`,
      **`REVENUECAT_WEBHOOK_SECRET`（未設定だとWebhookは全拒否になる仕様に変更済み）**
- [ ] Auth設定: パスワード最小長・漏洩パスワード保護を有効化 / メールテンプレートを日本語化 /
      パスワード再設定用の Site URL・Redirect URL を設定
- [ ] `commercial_products` の栄養値が「100gあたり」であることをデータ投入元と確認
      （バーコード追加は100gあたり前提でスケーリングしている）

## 3. RevenueCat

- [ ] Webhook URL を `revenuecat-webhook` 関数に設定し、Authorization ヘッダーを
      `Bearer <REVENUECAT_WEBHOOK_SECRET>` にする
- [ ] Offering に `monthly` / `sixMonth` パッケージを設定
- [ ] Entitlement ID `premium` を設定
- [ ] サンドバックスで購入 → `profiles.is_premium` がWebhook経由でtrueになることを確認
      （クライアント直接書込は廃止済み。Webhookが唯一の更新経路）

## 4. App Store Connect / Google Play

- [ ] プライバシーポリシーURLを用意（アプリ内文書 `src/lib/legal.ts` と同内容をWebに掲載）
- [ ] App Privacy（データ収集の申告）: 健康とフィットネス・連絡先情報・識別子など正確に申告
- [ ] サブスクリプショングループ + 自動更新商品(月額/半年)を作成し価格を設定
- [ ] 審査用デモアカウントを用意（食事記録・健診サンプル入り推奨）
- [ ] サポートURL / マーケティングURL
- [ ] `LEGAL_CONTACT_EMAIL`（`src/lib/legal.ts`）が正しい問い合わせ先か確認

## 5. 実機での最終確認

- [ ] カメラ撮影 → AI解析 → 保存（権限ダイアログの文言が日本語で出ること）
- [ ] バーコードスキャン（barcode-lookup関数の疎通）
- [ ] HealthKit / ヘルスコネクト連携と体重同期
- [ ] 通知許可 → 食事リマインダーが届くこと
- [ ] 購入 → 復元 →（別端末で）復元
- [ ] アカウント削除 → 再ログイン不可・データ消失を確認
- [ ] 機内モードで記録 → 復帰後に同期されること
- [ ] JST 0時〜9時に記録した食事が「今日」に表示されること（UTC日付バグ修正の確認）

## 6. 将来課題（今回スコープ外・競合パリティ）

- 週次レポート機能（あすけんのお便り相当）
- ストリークのクラウド同期（現状は端末ローカルのみ。機種変更で消える）
- MYセット（よく食べる組み合わせの一括記録）
- 食品検索の同義語・ゆらぎ対応の強化
- Android の Health Connect 実機検証
