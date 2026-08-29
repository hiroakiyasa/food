# Joyful Wellness UI Handoff

このディレクトリは、Expo React Nativeアプリを「明るく、楽しく、健康習慣を続けたくなる」UIへ再構築するための正本です。

## 優先順位

画像を文字どおり複製するのではなく、次の順で判断します。

1. 情報の優先順位と次の行動
2. 既存機能・実データとの整合
3. アクセシビリティと操作性
4. 全画面の一貫性
5. 色、角丸、装飾、細かな位置

画像だけでは実装できない部分は、既存のhooks、services、stores、typesを正とします。参照画像と実データ構造が衝突する場合は、既存のデータ契約を維持し、差分と理由を報告してください。

## ブランド原則

- コンセプト: Joyful Wellness
- 性格: 明るい、親しみやすい、信頼できる、前向き、継続しやすい
- 基調: サンライトクリーム、フレッシュグリーン、アプリコット、レモン、スカイ、ベリー
- 食事写真を主役にし、栄養値は花びら、成長、リボン、ガーデンなどで直感的に見せる
- 達成時だけ控えめなきらめきや紙吹雪を使う
- 医療・健康情報では診断を断定せず、落ち着いた説明と次の行動を示す

## 正式ナビゲーション

すべての画像で次に統一します。

1. ホーム
2. 記録
3. 中央カメラボタン（`/(modals)/camera` を開く）
4. 分析
5. マイページ

画像25などに含まれる「みつける」「記録する」「レポート」はコンセプト生成時の表記揺れであり、採用しません。`camera-tab.tsx` は画面ではなく中央ボタンのプレースホルダーです。

## 画面対応表

| # | 画像 | 実装先 | 役割 |
|---|---|---|---|
| 01 | `01-onboarding.png` | `app/auth/onboarding.tsx` | 初期設定フロー |
| 02 | `02-login.png` | `app/auth/login.tsx` | ログイン |
| 03 | `03-register.png` | `app/auth/register.tsx` | アカウント登録 |
| 04 | `04-home.png` | `app/(tabs)/index.tsx` | 今日の状態と次の行動 |
| 05 | `05-record.png` | `app/(tabs)/record.tsx` | 日別食事タイムライン |
| 06 | `06-camera.png` | `app/(modals)/camera.tsx` | 食事撮影 |
| 07 | `07-barcode.png` | `app/(modals)/barcode.tsx` | 商品確認と分量設定 |
| 08 | `08-food-search.png` | `app/(modals)/food-search.tsx` | 食品検索と食事構成 |
| 09 | `09-chat-meal.png` | `app/(modals)/chat-meal.tsx` | AI会話入力 |
| 10 | `10-meal-detail.png` | `app/(modals)/meal-detail.tsx` | 食事詳細と評価 |
| 11 | `11-nutrition-balance.png` | `app/(modals)/nutrition-balance.tsx` | 栄養ガーデン |
| 12 | `12-insights.png` | `app/(tabs)/insights.tsx` | 習慣と栄養の分析 |
| 13 | `13-condition-select.png` | `app/(modals)/condition-select.tsx` | 栄養条件選択 |
| 14 | `14-edit-profile.png` | `app/(modals)/edit-profile.tsx` | プロフィール |
| 15 | `15-edit-diseases.png` | `app/(modals)/edit-diseases.tsx` | 健康プロフィール |
| 16 | `16-edit-taste.png` | `app/(modals)/edit-taste.tsx` | 味覚嗜好 |
| 17 | `17-edit-nutrition-targets.png` | `app/(modals)/edit-nutrition-targets.tsx` | 栄養目標 |
| 18 | `18-health-checkup.png` | `app/(modals)/health-checkup.tsx` | 健診レポート |
| 19 | `19-healthkit-settings.png` | `app/(modals)/healthkit-settings.tsx` | ヘルスケア連携 |
| 20 | `20-meal-plan.png` | `app/(modals)/meal-plan.tsx` | 週間食事プラン |
| 21 | `21-recovery-plan.png` | `app/(modals)/recovery-plan.tsx` | リカバリープラン |
| 22 | `22-fasting-setup.png` | `app/(modals)/fasting-setup.tsx` | 食事時間の設定 |
| 23 | `23-cycle-setup.png` | `app/(modals)/cycle-setup.tsx` | 月経周期と栄養調整 |
| 24 | `24-notification-settings.png` | `app/(modals)/notification-settings.tsx` | 通知設定 |
| 25 | `25-settings.png` | `app/(tabs)/settings.tsx` | マイページ |
| 26 | `26-premium.png` | `app/(modals)/premium.tsx` | Premium案内 |

## 実装資料

- Claude Code初回セットアップ: `CLAUDE_SETUP.md`
- デザイントークン: `TOKENS.md`
- 実装順とアーキテクチャ: `IMPLEMENTATION.md`
- 画面の完了条件: `ACCEPTANCE.md`
- Claude Code用プロンプト: `PROMPTS.md`
