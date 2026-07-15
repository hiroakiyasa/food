# 実装計画: 食事栄養表示 + 手入力機能

## 現状分析

### データ構造の全体像

```
JSONデータ (468,905食品)
├── food_composition.json (MEXT 日本食品成分表: 2,541品)
├── usda_foundation.json (USDA基盤: 365品)
├── usda_sr_legacy.json (USDA標準: 7,793品)
├── usda_survey.json (USDA調査: 5,432品)
└── usda_branded_filtered.json (USDAブランド: 452,774品)
```

各食品は `FoodItem` 型で統一済み:
- `generalComponents`: エネルギー, タンパク質, 脂質, 炭水化物, 食物繊維, 食塩相当量, コレステロール
- `minerals`: ナトリウム, カリウム, カルシウム, マグネシウム, リン, 鉄, 亜鉛, 銅, マンガン, ヨウ素, セレン, クロム, モリブデン
- `vitamins`: ビタミンA~K, B群, C, 葉酸, ビオチン等 (22項目)
- `aminoAcids`: 必須/非必須アミノ酸 (25項目)
- `fattyAcids`: 飽和/一価/多価不飽和脂肪酸 (30+項目)
- `carbohydrateDetails`: 糖質詳細 (ブドウ糖, 果糖, ショ糖等)
- `dietaryFiber`: 水溶性/不溶性食物繊維の詳細
- `organicAcids`: 有機酸 (クエン酸, リンゴ酸等)

### DBスキーマ
- `food_items` テーブル: 基本栄養 + minerals/vitamins/amino_acids/fatty_acids (JSON列)
- `meals` テーブル: 食事全体の合計栄養 (P/F/C/fiber/sodium)
- `meal_items` テーブル: 個別食品 (名前, 分量, 栄養値, confidence)
- `meal_items.food_item_id`: food_items への外部キー (現在AI検出のみでnull)

### 現在の制限
1. **栄養表示**: P/F/C/Fiber のみ。minerals/vitamins は DB にあるが UI に表示されていない
2. **入力方法**: カメラ (AI検出) とバーコードのみ。手動検索・入力なし
3. **food_item_id**: meal_items に FK があるが、AI 検出では紐付けされていない

---

## 実装計画

### Phase 1: 食事の詳細栄養表示の強化

**目標**: 既存の meal-detail 画面で、P/F/C に加えてミネラル・ビタミン等の詳細栄養を表示

#### Step 1.1: 栄養詳細コンポーネントの作成
**ファイル**: `src/components/meal/NutritionDetail.tsx` (新規)

- 折りたたみ可能なセクション形式
- **基本栄養**: エネルギー, P, F, C, 食物繊維, 食塩相当量
- **ミネラル**: カリウム, カルシウム, 鉄, 亜鉛 等
- **ビタミン**: A, B1, B2, B6, B12, C, D, E, K, 葉酸 等
- 各値に対する1日の目標値比率をプログレスバーで表示
- `nutrition_targets` の値と連動

#### Step 1.2: meal-detail 画面の強化
**ファイル**: `app/(modals)/meal-detail.tsx` (既存修正)

- ExistingMealView に「詳細栄養」展開セクションを追加
- アイテムごとの詳細栄養は `food_item_id` が紐付いている場合のみ表示
- 合計値の計算ロジックを拡張 (minerals/vitamins の合計)

#### Step 1.3: ホーム画面の栄養サマリー強化
**ファイル**: `app/(tabs)/index.tsx` (既存修正)

- PFC BALANCE セクションの下に「主要ミネラル・ビタミン」の簡易表示を追加
- 不足している栄養素をハイライト表示

---

### Phase 2: 食品検索・手入力機能

**目標**: カメラ以外に食品DBから検索して手動で食事を記録

#### Step 2.1: 食品検索サービスの作成
**ファイル**: `src/services/food/searchFood.ts` (新規)

```typescript
// Supabase food_items テーブルからの検索
searchFoodItems(query: string, limit?: number): Promise<FoodItemRow[]>
// カテゴリ別フィルタ
searchByCategory(category: string): Promise<FoodItemRow[]>
```

- `food_items.food_name` に対する `ilike` 検索
- デバウンス付き (300ms)
- 検索結果を日本語名で表示、USDA品はカテゴリ表示

#### Step 2.2: 食品検索フック
**ファイル**: `src/hooks/useFoodSearch.ts` (新規)

- React Query ベースの検索フック
- 検索クエリのデバウンス処理
- カテゴリフィルタ対応
- 最近使った食品のキャッシュ

#### Step 2.3: 手入力モーダル画面
**ファイル**: `app/(modals)/manual-entry.tsx` (新規)

**画面構成**:
1. **食事タイプ選択**: 朝食/昼食/夕食/間食 チップ
2. **食品追加方法の切り替え**:
   - 「検索」タブ: DB検索で食品を追加
   - 「カスタム」タブ: 栄養素を直接入力
3. **検索タブ**:
   - テキスト入力フィールド (検索バー)
   - 検索結果リスト (食品名, カテゴリ, 100gあたりのkcal)
   - タップで分量入力ダイアログ (グラム単位)
   - 追加済みアイテムリスト (スワイプ削除可能)
4. **カスタムタブ**:
   - 食品名テキスト入力
   - 分量 (g) 入力
   - 基本栄養素入力フィールド: エネルギー, P, F, C, 食物繊維, ナトリウム
5. **保存ボタン**: 合計栄養の自動計算 → meals + meal_items に保存

#### Step 2.4: 分量入力コンポーネント
**ファイル**: `src/components/meal/PortionInput.tsx` (新規)

- グラム直接入力
- よくある分量のプリセットボタン (USDA `foodPortions` データを活用):
  - 例: 「1杯 (150g)」「1個 (200g)」「小盛り (100g)」
- 栄養値のリアルタイムプレビュー (分量に比例して計算)

#### Step 2.5: 栄養計算ユーティリティ
**ファイル**: `src/services/nutrition/calculate.ts` (新規)

```typescript
// food_items の100gあたり栄養値から、指定グラムの栄養値を計算
calculateNutrients(foodItem: FoodItemRow, portionGrams: number): NutrientValues

// 複数アイテムの合計を計算
sumNutrients(items: { nutrients: NutrientValues; grams: number }[]): NutrientValues

// food_items の JSON minerals/vitamins から詳細栄養を展開
expandDetailedNutrients(foodItem: FoodItemRow, portionGrams: number): DetailedNutrients
```

#### Step 2.6: mealStore の拡張
**ファイル**: `src/stores/mealStore.ts` (既存修正)

- `PendingMeal` に手入力用の状態を追加:
  - `manualItems: ManualFoodEntry[]` (検索から追加した食品リスト)
  - `inputMode: 'camera' | 'manual'`

#### Step 2.7: 記録画面への導線追加
**ファイル**: `app/(tabs)/record.tsx` (既存修正)

- 「+ 追加」ボタンに選択肢を追加:
  - 「撮影して記録」 → カメラモーダル
  - 「手入力で記録」 → 手入力モーダル
- ActionSheet またはドロップダウンメニューで選択

---

### Phase 3: 食品検索→栄養紐付けの強化

#### Step 3.1: meal_items と food_items の紐付け
- 手入力で食品を追加した場合、`meal_items.food_item_id` に food_items の ID をセット
- これにより詳細栄養 (minerals/vitamins/amino_acids) が取得可能に

#### Step 3.2: 既存食事の編集機能
**ファイル**: `app/(modals)/meal-detail.tsx` (既存修正)

- ExistingMealView に「編集」ボタンを追加
- アイテムの追加/削除/分量変更が可能
- `useUpdateMeal` フックを活用

---

## 新規ファイル一覧

| ファイル | 種別 | 説明 |
|---------|------|------|
| `src/components/meal/NutritionDetail.tsx` | コンポーネント | 詳細栄養表示 (折りたたみ) |
| `src/components/meal/PortionInput.tsx` | コンポーネント | 分量入力 + プリセット |
| `src/services/food/searchFood.ts` | サービス | 食品DB検索 |
| `src/services/nutrition/calculate.ts` | ユーティリティ | 分量ベースの栄養計算 |
| `src/hooks/useFoodSearch.ts` | フック | 食品検索 React Query |
| `app/(modals)/manual-entry.tsx` | 画面 | 手入力モーダル |

## 既存ファイル修正一覧

| ファイル | 変更内容 |
|---------|---------|
| `app/(modals)/meal-detail.tsx` | 詳細栄養セクション追加, 編集ボタン |
| `app/(tabs)/record.tsx` | 追加ボタンに手入力への導線 |
| `app/(tabs)/index.tsx` | ミネラル・ビタミンサマリー |
| `src/stores/mealStore.ts` | 手入力用の状態追加 |
| `src/types/nutrition.ts` | DetailedNutrients 型追加 |

---

## 実装順序

1. **Phase 2 (Step 2.5)**: 栄養計算ユーティリティ (他の全ステップの基盤)
2. **Phase 2 (Step 2.1-2.2)**: 食品検索サービス+フック
3. **Phase 2 (Step 2.4)**: 分量入力コンポーネント
4. **Phase 2 (Step 2.3, 2.6)**: 手入力モーダル画面 + Store拡張
5. **Phase 2 (Step 2.7)**: record.tsx への導線追加
6. **Phase 1 (Step 1.1)**: 栄養詳細コンポーネント
7. **Phase 1 (Step 1.2)**: meal-detail の強化
8. **Phase 1 (Step 1.3)**: ホーム画面の栄養サマリー
9. **Phase 3**: 紐付け + 編集機能
