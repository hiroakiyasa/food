# CLAUDE.md

@AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定
- **すべての回答は日本語で行うこと**

## プロジェクト概要

食事記録・栄養管理モバイルアプリ「食事サポート」。AI画像分析、バーコード読み込み、食品DB検索により食事を記録し、栄養バランスを可視化する。

## Joyful Wellness UI 再構築

- UIの正本は `design/ui-concepts-joyful/README.md` と同ディレクトリの26枚のPNG。
- 実装手順は `design/ui-concepts-joyful/IMPLEMENTATION.md`、完了条件は `design/ui-concepts-joyful/ACCEPTANCE.md` を参照。
- 初回セットアップと公式プラグイン導入は `design/ui-concepts-joyful/CLAUDE_SETUP.md` を参照。
- UI作業では `.claude/rules/joyful-ui.md` を必ず守る。
- 画像は視覚的な基準であり、背景画像や切り抜き素材として使用しない。
- 既存の hooks / services / stores / Supabaseデータフローを維持し、UIレイヤーから段階的に置き換える。
- 一度に全画面を変更せず、原則1〜3画面単位で実装・型チェック・スクリーンショット検証する。

## 開発コマンド

```bash
# アプリ実行
npm start                              # Expo dev server
npm run ios                            # iOS シミュレータ
npm run android                        # Android エミュレータ
npm run web                            # Web ブラウザ

# 型チェック (テストスイート未整備のため、変更後は必ず実行)
npx tsc --noEmit

# スクレイパー (食品データパイプライン)
npm run --prefix scraper usda          # フル処理
npm run --prefix scraper usda:test     # テスト (小規模サンプル)
npm run --prefix scraper usda:download # ダウンロードのみ
```

## 技術スタック

- **Expo 54** + React Native 0.81 + React 19 + TypeScript strict
- **ルーティング**: Expo Router (typed routes, file-based)
- **状態管理**: Zustand (ローカル) + React Query v5 (サーバー状態, offlineFirst, 24h persist)
- **スタイリング**: Nativewind (TailwindCSS on React Native)
- **バックエンド**: Supabase (PostgreSQL + Auth + Edge Functions + Storage)
- **認証**: Supabase Auth + Expo SecureStore (iOS/Android トークン暗号化)
- **チャート**: react-native-gifted-charts + react-native-svg
- **デバイス連携**: HealthKit (iOS), Health Connect (Android), カメラ, 音声認識, プッシュ通知

## アーキテクチャ

### レイヤー構造
```
app/                    # Expo Router 画面・レイアウト (UIレイヤー)
  ├── (tabs)/           #   メインタブ (5つ: ホーム, 記録, カメラFAB, 分析, 設定)
  ├── (modals)/         #   モーダル画面 (15個)
  └── auth/             #   認証フロー (onboarding → login/register)
src/
  ├── components/       # 再利用コンポーネント (home/, record/, meal/, chart/, ui/ 等)
  ├── hooks/            # React Query フック + カスタムフック (23個)
  ├── services/         # ビジネスロジック (ai/, barcode/, nutrition/, health/, chat/)
  ├── stores/           # Zustand store (meal, auth, ui, health, notification, chat)
  ├── lib/              # インフラ (supabase client, constants, theme, query persister)
  ├── types/            # TypeScript 型定義 (database.ts にSupabase全テーブル型)
  └── utils/            # ユーティリティ (formatters, validators)
scraper/                # 食品DBスクレイパー (独立 Node.js ワークスペース, MEXT+USDA)
data/                   # スクレイパー出力 (468K+ 食品 JSON)
supabase/               # マイグレーション + Edge Functions
modules/                # ネイティブモジュール (speech-native)
```

### データフロー
- **カメラ入力**: 撮影 → mealStore → Supabase Edge Function (AI解析) → meals/meal_items テーブル
- **バーコード**: スキャン → barcode lookup → commercial_products テーブル
- **手入力**: 食品検索 → food_items テーブル (468K+件, ilike) → 分量入力 → 栄養計算
- **UI表示**: hooks (React Query) → Supabase (RLS) → コンポーネント

### 認証ガート
`app/_layout.tsx` の `AuthGate` がセッションとオンボーディング状態を監視し、未認証ユーザーを `/auth/onboarding` にリダイレクトする。

### React Query 設定
- `networkMode: 'offlineFirst'` — オフライン時もキャッシュから提供
- `staleTime: 5分`, `gcTime: 24時間`
- `PersistQueryClientProvider` + AsyncStorage でキャッシュ永続化

## コーディング規約

- TypeScript strict mode。`any` は正当な理由がない限り使用禁止
- 2スペースインデント、セミコロン使用
- フック名: `useXxx` (`src/hooks/`)、ストア名: `xxxStore.ts` (`src/stores/`)
- アプリコード内は `@/...` エイリアスインポートを使用
- 変更対象外のファイルをリフォーマットしない

## DBスキーマの重要ポイント

- `food_items`: 基本栄養列 + `minerals`/`vitamins`/`amino_acids`/`fatty_acids` はJSON列
- `meal_items.food_item_id`: food_items への FK (AI検出時はnull、手入力時のみ紐付け)
- `profiles.is_premium` / `subscriptions`: RevenueCat連携の課金管理
- `daily_summaries`: 日次集計テーブル (自動計算)
- `weekly_buffers`: 週単位のカロリー・塩分バッファ管理

## Supabase

- クライアント接続情報は `.env.local` の `EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` から読み込む
- `sb_secret_` やservice-role keyはクライアントやGitに絶対に置かない
- DDL変更は `supabase/migrations/` にSQLファイルとして管理
- Edge Functions は `supabase/functions/` (Deno runtime)
- 認証トークンは Expo SecureStore で暗号化保存 (iOS/Android)

## 検証チェックリスト

- アプリコード変更: `npx tsc --noEmit`
- スクレイパー変更: `npm run --prefix scraper usda:test`
- UI変更: スクリーンショット添付を推奨
