# Implementation Plan

## 実装方針

フロントエンドを全面削除して作り直すのではなく、既存のデータ取得とビジネスロジックを維持したまま、デザイントークン、共通部品、画面の順に置換します。

### 維持するもの

- `src/hooks/` のReact Queryフック
- `src/services/` の栄養計算、AI、Health、通知ロジック
- `src/stores/` のZustand状態
- `src/types/` のデータ契約
- Supabase/Auth/RevenueCat/HealthKit連携
- オフラインキャッシュと認証ガード

### UI都合で変更してよいもの

- `app/` のレイアウトと表示構造
- `src/components/` の見た目とコンポジション
- `src/lib/theme.ts` と新規Joyfulトークン
- 表示専用のformatters、view model、adapter

## 共通コンポーネント候補

```text
src/components/joyful/
├── JoyfulScreen.tsx
├── JoyfulHeader.tsx
├── JoyfulCard.tsx
├── JoyfulButton.tsx
├── JoyfulIconButton.tsx
├── JoyfulChip.tsx
├── JoyfulProgressRing.tsx
├── NutrientPetals.tsx
├── AchievementBadge.tsx
├── FoodPhotoCard.tsx
├── MealTimelineItem.tsx
├── EmptyMealCard.tsx
├── InsightCard.tsx
├── MetricCard.tsx
├── SectionHeader.tsx
└── StateView.tsx
```

必要になった時点で作成し、先回りして巨大なコンポーネントライブラリを作らないでください。

## 実装フェーズ

### Phase 0: 基盤

1. Joyful tokens
2. SafeArea、スクロール、画面背景
3. ボタン、カード、チップ、ヘッダー
4. 正式タブバー
5. loading / empty / error / offline共通状態

### Phase 1: 毎日のコアループ

1. 04 Home
2. 05 Record
3. 06 Camera
4. 08 Food Search
5. 09 AI Chat
6. 07 Barcode

### Phase 2: 理解と改善

1. 10 Meal Detail
2. 11 Nutrition Balance
3. 12 Insights
4. 20 Meal Plan
5. 21 Recovery Plan

### Phase 3: 個人最適化

1. 25 My Page
2. 14 Profile
3. 13 Conditions
4. 15 Diseases
5. 16 Taste
6. 17 Nutrition Targets
7. 18 Health Checkup
8. 19 HealthKit
9. 22 Fasting
10. 23 Cycle
11. 24 Notifications

### Phase 4: 導入と収益

1. 01 Onboarding
2. 02 Login
3. 03 Register
4. 26 Premium

## 1画面ごとの作業ループ

1. 対象PNG、現在のroute、関連components、hooksを読む
2. 画像の情報階層を既存データへマッピングする
3. 変更ファイルと再利用部品を提示する
4. 1〜3画面だけ実装する
5. `npx tsc --noEmit`
6. iOSまたはAndroidで対象画面を撮影する
7. 参照画像と比較し、余白・階層・色・タップ領域を修正する
8. loading / empty / error / offlineを確認する
9. 変更点と意図的な差分を記録する

## 重要な判断

- 参照PNGの縦横比はiPhoneの一般的な縦長画面に近いが、固定ピクセルで実装しない。
- iPhone SE相当の狭い幅、標準iPhone、Androidで成立させる。
- 画像内に存在しても、データがない指標はフェイク値で埋めず、適切なempty stateを出す。
- 画面内の装飾より、記録完了までのタップ数と次の行動の明確さを優先する。
- Web版には既存のビルド問題があるため、UI比較はまずiOS/Androidを正とする。
