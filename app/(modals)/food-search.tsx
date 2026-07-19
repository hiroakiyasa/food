import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { eatenAtForDate, getToday } from '@/src/utils/formatters';
import { useColorScheme } from '@/components/useColorScheme';
import { useCreateMeal } from '@/src/hooks/useMeals';
import { useFoodSearchInfinite, useFoodCategories } from '@/src/hooks/useFoodSearch';
import { useFoodItemDetail } from '@/src/hooks/useFoodItemDetail';
import { useAuthStore } from '@/src/stores/authStore';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { NutritionDetailSections } from '@/src/components/nutrition/NutritionDetailSections';
import type { FoodItemSearchResult } from '@/src/services/food/searchFood';
import { fetchFoodImage } from '@/src/services/food/fetchFoodImage';
import foodImageMap from '@/src/data/foodImageMap.json';
import foodImageAssets from '@/src/data/foodImageAssets';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
  type ThemeColors,
} from '@/src/lib/theme';

// ─── Category emoji mapping ───
const CATEGORY_EMOJI: Record<string, string> = {
  '穀類': '🌾',
  '肉類': '🥩',
  '魚介類': '🐟',
  '野菜類': '🥬',
  '果実類': '🍎',
  '乳類': '🥛',
  '卵類': '🥚',
  '豆類': '🫘',
  'いも及びでん粉類': '🥔',
  'きのこ類': '🍄',
  '藻類': '🌿',
  '種実類': '🥜',
  '菓子類': '🍪',
  '油脂類': '🫒',
  '砂糖及び甘味類': '🍬',
  '調味料及び香辛料類': '🧂',
  'し好飲料類': '☕',
  '調理加工食品類': '🍱',
};

const CATEGORY_BG: Record<string, string> = {
  '穀類': '#FEF9C3',
  '肉類': '#FEE2E2',
  '魚介類': '#E0F2FE',
  '野菜類': '#DCFCE7',
  '果実類': '#FCE7F3',
  '乳類': '#F1F5F9',
  '卵類': '#FFF7ED',
  '豆類': '#ECFCCB',
  'いも及びでん粉類': '#FEF3C7',
  'きのこ類': '#F5F3FF',
  '藻類': '#DDF3E6',
  '種実類': '#FEF3C7',
  '菓子類': '#FCE7F3',
  '油脂類': '#ECFDF5',
  '砂糖及び甘味類': '#FDF2F8',
  '調味料及び香辛料類': '#F1F5F9',
  'し好飲料類': '#EFF6FF',
  '調理加工食品類': '#FFF1F2',
};

interface SelectedFoodItem {
  food: FoodItemSearchResult;
  portionGrams: number;
  imageUrl: string | null;
}

function calculateNutrition(food: FoodItemSearchResult, grams: number) {
  const ratio = grams / 100;
  return {
    energy_kcal: (food.energy_kcal ?? 0) * ratio,
    protein_g: (food.protein_g ?? 0) * ratio,
    fat_g: (food.fat_g ?? 0) * ratio,
    carbohydrate_g: (food.carbohydrate_g ?? 0) * ratio,
    fiber_g: (food.fiber_g ?? 0) * ratio,
    sodium_mg: (food.sodium_mg ?? 0) * ratio,
    cholesterol_mg: (food.cholesterol_mg ?? 0) * ratio,
  };
}

const PORTION_PRESETS = [50, 100, 150, 200];

// ─── NutritionTable ───

function NutritionTable({ n, unit, bg, c }: {
  n: { energy_kcal: number; protein_g: number; fat_g: number; carbohydrate_g: number; fiber_g: number; sodium_mg: number; cholesterol_mg: number };
  unit: string;
  bg: string;
  c: ThemeColors;
}) {
  return (
    <View style={[styles.nutritionTable, { backgroundColor: bg }]}>
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>エネルギー</Text>
        <Text style={[styles.nutritionValue, { color: c.text }]}>{Math.round(n.energy_kcal)} kcal</Text>
      </View>
      <View style={[styles.nutritionDivider, { backgroundColor: c.border }]} />
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>たんぱく質</Text>
        <Text style={[styles.nutritionValue, { color: palette.protein }]}>{n.protein_g.toFixed(1)} g</Text>
      </View>
      <View style={[styles.nutritionDivider, { backgroundColor: c.border }]} />
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>脂質</Text>
        <Text style={[styles.nutritionValue, { color: palette.fat }]}>{n.fat_g.toFixed(1)} g</Text>
      </View>
      <View style={[styles.nutritionDivider, { backgroundColor: c.border }]} />
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>炭水化物</Text>
        <Text style={[styles.nutritionValue, { color: palette.carbs }]}>{n.carbohydrate_g.toFixed(1)} g</Text>
      </View>
      <View style={[styles.nutritionDivider, { backgroundColor: c.border }]} />
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>食物繊維</Text>
        <Text style={[styles.nutritionValue, { color: palette.fiber }]}>{n.fiber_g.toFixed(1)} g</Text>
      </View>
      <View style={[styles.nutritionDivider, { backgroundColor: c.border }]} />
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>コレステロール</Text>
        <Text style={[styles.nutritionValue, { color: c.textSecondary }]}>{Math.round(n.cholesterol_mg)} mg</Text>
      </View>
      <View style={[styles.nutritionDivider, { backgroundColor: c.border }]} />
      <View style={styles.nutritionRow}>
        <Text style={[styles.nutritionLabel, { color: c.text }]}>食塩相当量</Text>
        <Text style={[styles.nutritionValue, { color: palette.salt }]}>{((n.sodium_mg / 1000) * 2.54).toFixed(2)} g</Text>
      </View>
      <Text style={[styles.nutritionUnit, { color: c.textMuted }]}>{unit}</Text>
    </View>
  );
}

// ─── Category Card Grid ───

function CategoryGrid({
  categories,
  onSelect,
  isDark,
}: {
  categories: { name: string; count: number }[];
  onSelect: (cat: string) => void;
  isDark: boolean;
}) {
  const c = useThemeColors(isDark);
  return (
    <View style={styles.categoryGrid}>
      {categories.map((cat) => {
        const emoji = CATEGORY_EMOJI[cat.name] ?? '🍽️';
        const bg = CATEGORY_BG[cat.name] ?? (isDark ? c.surfaceAlt : '#FFF9EC');
        return (
          <Pressable
            key={cat.name}
            onPress={() => onSelect(cat.name)}
            style={({ pressed: p }) => [
              styles.categoryGridCard,
              { backgroundColor: isDark ? c.surface : bg },
              shadow.sm,
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${cat.name}を選択`}
          >
            <Text style={styles.categoryGridEmoji}>{emoji}</Text>
            <Text style={[styles.categoryGridName, { color: c.text }]} numberOfLines={2}>
              {cat.name}
            </Text>
            <Text style={[typography.caption2, { color: c.textMuted }]}>
              {cat.count}品
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Card width for 3-column grid ───
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = spacing.lg * 2;
const GRID_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GRID_GAP * 2) / 3;

// ─── FoodGridCard ───

const FoodGridCard = React.memo(function FoodGridCard({
  item,
  isDark,
  c,
  onSelect,
}: {
  item: FoodItemSearchResult;
  isDark: boolean;
  c: ThemeColors;
  onSelect: (item: FoodItemSearchResult) => void;
}) {
  // ローカルアセット優先、なければ Unsplash API で取得
  const localAssetKey = (foodImageMap as Record<string, string>)[item.id];
  const localAsset = localAssetKey ? (foodImageAssets as Record<string, unknown>)[localAssetKey] : null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(!localAsset);
  const emoji = CATEGORY_EMOJI[item.category_name] ?? '🍽️';

  useEffect(() => {
    if (localAsset) return; // ローカルアセットがあれば API 不要
    let cancelled = false;
    setImageLoading(true);
    fetchFoodImage(item).then((url) => {
      if (!cancelled) {
        setImageUrl(url);
        setImageLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [item.id, localAsset]);

  return (
    <Pressable
      onPress={() => onSelect(item)}
      style={({ pressed: p }) => [
        styles.gridCard,
        { backgroundColor: c.surface, width: CARD_WIDTH },
        shadow.sm,
        pressed(p),
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.food_name}
    >
      {localAsset ? (
        <Image source={localAsset as number} style={styles.gridCardImage} resizeMode="cover" />
      ) : imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.gridCardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.gridCardImagePlaceholder, { backgroundColor: c.surfaceAlt }]}>
          {imageLoading
            ? <ActivityIndicator size="small" color={palette.primary} />
            : <Text style={{ fontSize: 30 }}>{emoji}</Text>
          }
        </View>
      )}
      <View style={styles.gridCardBody}>
        <Text style={[styles.gridCardName, { color: c.text }]} numberOfLines={2}>
          {item.food_name}
        </Text>
        <Text style={[styles.gridCardKcal, { color: palette.primary }]}>
          {Math.round(item.energy_kcal ?? 0)} kcal
        </Text>
      </View>
    </Pressable>
  );
});

// ─── FoodDetailModal ───

function FoodDetailModal({
  item,
  portionInput,
  isDark,
  c,
  onPortionChange,
  onAddToCart,
  onClose,
}: {
  item: FoodItemSearchResult;
  portionInput: string;
  isDark: boolean;
  c: ThemeColors;
  onPortionChange: (value: string) => void;
  onAddToCart: (food: FoodItemSearchResult, imageUrl: string | null) => void;
  onClose: () => void;
}) {
  const localAssetKey = (foodImageMap as Record<string, string>)[item.id];
  const localAsset = localAssetKey ? (foodImageAssets as Record<string, unknown>)[localAssetKey] : null;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useFoodItemDetail(item.id);

  useEffect(() => {
    if (localAsset) return;
    fetchFoodImage(item).then(setImageUrl);
  }, [item.id, localAsset]);

  const per100 = {
    energy_kcal: item.energy_kcal ?? 0,
    protein_g: item.protein_g ?? 0,
    fat_g: item.fat_g ?? 0,
    carbohydrate_g: item.carbohydrate_g ?? 0,
    fiber_g: item.fiber_g ?? 0,
    sodium_mg: item.sodium_mg ?? 0,
    cholesterol_mg: item.cholesterol_mg ?? 0,
  };
  const previewGrams = parseInt(portionInput, 10) || 100;
  const preview = calculateNutrition(item, previewGrams);

  return (
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.detailSheetContainer}
      >
        <View style={[styles.detailSheet, { backgroundColor: c.bg }]}>
          {/* Handle bar */}
          <View style={[styles.detailSheetHandle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={styles.detailSheetHeader}>
            <Text style={[typography.title3, { color: c.text, flex: 1 }]} numberOfLines={2}>
              {item.food_name}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="閉じる">
              <Text style={[typography.title3, { color: c.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Food image */}
            {(localAsset || imageUrl) && (
              <Image
                source={localAsset ? localAsset as number : { uri: imageUrl! }}
                style={styles.detailSheetImage}
                resizeMode="cover"
              />
            )}

            <NutritionTable n={per100} unit="※100gあたり" bg={c.surfaceAlt} c={c} />

            <Text style={[typography.caption1, { color: c.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>
              分量 (g)
            </Text>
            <View style={styles.portionRow}>
              <TextInput
                style={[
                  commonStyles.input,
                  styles.portionInput,
                  { backgroundColor: c.surface, borderColor: c.border, color: c.text },
                ]}
                value={portionInput}
                onChangeText={onPortionChange}
                keyboardType="numeric"
                selectTextOnFocus
                accessibilityLabel="分量を入力"
              />
              {PORTION_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => onPortionChange(String(preset))}
                  style={({ pressed: p }) => [
                    styles.presetChip,
                    portionInput === String(preset) && styles.presetChipActive,
                    pressed(p),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${preset}g`}
                >
                  <Text style={[styles.presetText, portionInput === String(preset) && styles.presetTextActive]}>
                    {preset}g
                  </Text>
                </Pressable>
              ))}
            </View>

            <NutritionTable n={preview} unit={`※${previewGrams}gあたり`} bg={palette.primaryLight} c={c} />

            {detailLoading && (
              <View style={styles.detailLoadingRow}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={[typography.caption2, { color: c.textMuted }]}>詳細データを読み込み中...</Text>
              </View>
            )}
            {detail && (
              <NutritionDetailSections detail={detail} portionGrams={previewGrams} isDark={isDark} />
            )}

            <Pressable
              onPress={() => onAddToCart(item, imageUrl)}
              style={({ pressed: p }) => [styles.addButton, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="カートに追加"
            >
              <Text style={styles.addButtonText}>+ カートに追加</Text>
            </Pressable>
            <View style={{ height: spacing['3xl'] }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Main modal ───

export default function FoodSearchModal() {
  const router = useRouter();
  const { mealType, date } = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getToday();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);

  const user = useAuthStore((s) => s.user);
  const createMeal = useCreateMeal();
  const searchInputRef = useRef<TextInput>(null);

  // Search & filter state
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { data: categories } = useFoodCategories();

  // 無限スクロール検索
  const {
    data: pagedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useFoodSearchInfinite(query, selectedCategory);

  const searchResults = useMemo(
    () => pagedData?.pages.flat() ?? [],
    [pagedData],
  );

  // Cart state
  const [selectedItems, setSelectedItems] = useState<SelectedFoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItemSearchResult | null>(null);
  const [portionInput, setPortionInput] = useState('100');

  // Meal type
  const initialMealType = (mealType && MEAL_TYPES.includes(mealType as MealType))
    ? mealType as MealType
    : 'lunch';
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);

  const [saving, setSaving] = useState(false);

  // Cart totals
  const cartTotals = useMemo(() => {
    return selectedItems.reduce(
      (acc, { food, portionGrams }) => {
        const n = calculateNutrition(food, portionGrams);
        return {
          energy_kcal: acc.energy_kcal + n.energy_kcal,
          protein_g: acc.protein_g + n.protein_g,
          fat_g: acc.fat_g + n.fat_g,
          carbohydrate_g: acc.carbohydrate_g + n.carbohydrate_g,
          fiber_g: acc.fiber_g + n.fiber_g,
          sodium_mg: acc.sodium_mg + n.sodium_mg,
          cholesterol_mg: acc.cholesterol_mg + n.cholesterol_mg,
        };
      },
      { energy_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0, fiber_g: 0, sodium_mg: 0, cholesterol_mg: 0 },
    );
  }, [selectedItems]);

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setQuery('');
    setSelectedFood(null);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedCategory) {
      setSelectedCategory(undefined);
      setSelectedFood(null);
    } else {
      setQuery('');
    }
  }, [selectedCategory]);

  const handleAddToCart = useCallback((food: FoodItemSearchResult, imageUrl: string | null) => {
    const grams = Math.max(1, parseInt(portionInput, 10) || 100);
    setSelectedItems((prev) => [...prev, { food, portionGrams: grams, imageUrl }]);
    setSelectedFood(null);
    setPortionInput('100');
  }, [portionInput]);

  const handleRemoveFromCart = useCallback((index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    if (selectedItems.length === 0 || !user) return;

    setSaving(true);
    try {
      let mealImageUrl = selectedItems.find((item) => !!item.imageUrl)?.imageUrl ?? null;
      if (!mealImageUrl && selectedItems[0]) {
        mealImageUrl = await fetchFoodImage(selectedItems[0].food);
      }

      await createMeal.mutateAsync({
        meal: {
          meal_type: selectedMealType,
          eaten_at: eatenAtForDate(targetDate),
          image_url: mealImageUrl,
          total_energy_kcal: cartTotals.energy_kcal,
          total_protein_g: cartTotals.protein_g,
          total_fat_g: cartTotals.fat_g,
          total_carbohydrate_g: cartTotals.carbohydrate_g,
          total_fiber_g: cartTotals.fiber_g,
          total_sodium_mg: cartTotals.sodium_mg,
        },
        items: selectedItems.map(({ food, portionGrams }) => {
          const n = calculateNutrition(food, portionGrams);
          return {
            food_item_id: food.id,
            ai_detected_name: food.food_name,
            portion_grams: portionGrams,
            confidence: 1.0,
            energy_kcal: n.energy_kcal,
            protein_g: n.protein_g,
            fat_g: n.fat_g,
            carbohydrate_g: n.carbohydrate_g,
            fiber_g: n.fiber_g,
            sodium_mg: n.sodium_mg,
          };
        }),
      });

      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived state ───
  const showCategoryGrid = !selectedCategory && !query.trim();
  const showFoodList = !!selectedCategory || !!query.trim();

  // ─── Renderers ───
  const renderGridCard = useCallback(({ item }: { item: FoodItemSearchResult }) => (
    <FoodGridCard
      item={item}
      isDark={isDark}
      c={c}
      onSelect={(food) => { setSelectedFood(food); setPortionInput('100'); }}
    />
  ), [isDark, c]);

  // ─── Header: meal type + top bar ───
  const TopBar = (
    <View>
      {/* Meal type chips */}
      <View style={styles.mealTypeRow}>
        {MEAL_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => setSelectedMealType(type)}
            style={({ pressed: p }) => [
              commonStyles.chip,
              selectedMealType === type && commonStyles.chipActive,
              pressed(p),
            ]}
            accessibilityRole="radio"
            accessibilityLabel={MEAL_TYPE_LABELS[type]}
            accessibilityState={{ selected: selectedMealType === type }}
          >
            <Text style={[commonStyles.chipText, selectedMealType === type && commonStyles.chipTextActive]}>
              {MEAL_TYPE_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 常時表示の検索バー */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: c.text }]}
          placeholder="食品名で検索..."
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (text.trim()) setSelectedCategory(undefined);
          }}
          returnKeyType="search"
          accessibilityLabel="食品名を入力"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="クリア">
            <Text style={[typography.body, { color: c.textMuted }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Action bar: back (カテゴリ選択時のみ) */}
      <View style={styles.actionBar}>
        {selectedCategory ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed: p }) => [styles.backButton, { backgroundColor: c.surfaceAlt }, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Text style={[typography.body, { color: c.text }]}>← 戻る</Text>
          </Pressable>
        ) : (
          <Text style={[typography.bodyBold, { color: c.text }]}>
            {query.trim() ? '検索結果' : 'カテゴリから選択'}
          </Text>
        )}
      </View>

      {/* Category title */}
      {selectedCategory && (
        <View style={styles.categoryTitleRow}>
          <Text style={styles.categoryTitleEmoji}>{CATEGORY_EMOJI[selectedCategory] ?? '🍽️'}</Text>
          <Text style={[typography.title3, { color: c.text }]}>{selectedCategory}</Text>
        </View>
      )}

      {/* Loading */}
      {showFoodList && (isLoading || isFetching) && !isFetchingNextPage && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={palette.primary} />
          <Text style={[typography.caption1, { color: c.textMuted }]}>読み込み中...</Text>
        </View>
      )}

      {/* Error */}
      {showFoodList && isSearchError && !isLoading && !isFetching && (
        <View style={styles.hintContainer}>
          <Text style={[typography.body, { color: c.textMuted, textAlign: 'center' }]}>
            検索できませんでした。通信環境をご確認ください。
          </Text>
          <Pressable
            onPress={() => refetchSearch()}
            style={({ pressed: p }) => [styles.retryButton, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="再試行"
          >
            <Text style={[typography.bodyBold, { color: palette.primary }]}>再試行</Text>
          </Pressable>
        </View>
      )}

      {/* No results */}
      {showFoodList && !isSearchError && !isLoading && !isFetching && searchResults.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={[typography.body, { color: c.textMuted, textAlign: 'center' }]}>
            一致する食品が見つかりませんでした
          </Text>
        </View>
      )}
    </View>
  );

  // ─── Cart footer ───
  const CartFooter = useMemo(() => {
    if (selectedItems.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <Text style={[typography.title3, { color: c.text, marginBottom: spacing.sm }]}>
          カート ({selectedItems.length}品)
        </Text>
        {selectedItems.map((item, index) => {
          const n = calculateNutrition(item.food, item.portionGrams);
          return (
            <View key={`${item.food.id}-${index}`} style={[styles.cartItem, { backgroundColor: c.surface }]}>
              <Text style={styles.cartEmoji}>{CATEGORY_EMOJI[item.food.category_name] ?? '🍽️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: c.text }]} numberOfLines={1}>{item.food.food_name}</Text>
                <Text style={[typography.caption2, { color: c.textSecondary }]}>
                  {item.portionGrams}g · {Math.round(n.energy_kcal)} kcal
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveFromCart(index)}
                style={({ pressed: p }) => [styles.removeButton, pressed(p)]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${item.food.food_name}を削除`}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </Pressable>
            </View>
          );
        })}
        <Text style={[typography.title3, { color: c.text, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
          合計栄養成分
        </Text>
        <NutritionTable n={cartTotals} unit="※合計" bg={c.surfaceAlt} c={c} />
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed: p }) => [
            commonStyles.buttonPrimary,
            { marginTop: spacing.md },
            saving && { opacity: 0.6 },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel="保存する"
        >
          <Text style={[commonStyles.buttonText, { fontSize: 18 }]}>
            {saving ? '保存中...' : '保存する'}
          </Text>
        </Pressable>
      </View>
    );
  }, [selectedItems, cartTotals, saving, c, handleRemoveFromCart, handleSave]);

  // ─── Category grid view ───
  if (showCategoryGrid) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: c.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {TopBar}

          {categories && categories.length > 0 ? (
            <CategoryGrid categories={categories} onSelect={handleCategorySelect} isDark={isDark} />
          ) : (
            <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: spacing['3xl'] }} />
          )}

          {CartFooter}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Food list view (category or search) ───
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderGridCard}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={TopBar}
        ListFooterComponent={
          <>
            {isFetchingNextPage && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={[typography.caption1, { color: c.textMuted }]}>さらに読み込み中...</Text>
              </View>
            )}
            {CartFooter}
          </>
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.4}
      />

      {/* Detail Modal */}
      <Modal
        visible={selectedFood !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFood(null)}
      >
        {selectedFood && (
          <FoodDetailModal
            item={selectedFood}
            portionInput={portionInput}
            isDark={isDark}
            c={c}
            onPortionChange={setPortionInput}
            onAddToCart={handleAddToCart}
            onClose={() => setSelectedFood(null)}
          />
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 60 },

  // Top bar
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },

  // Category title
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryTitleEmoji: { fontSize: 24 },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  hintContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  retryButton: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // ─── Category grid ───
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryGridCard: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    gap: spacing.xs,
    minWidth: 90,
  },
  categoryGridEmoji: { fontSize: 36 },
  categoryGridName: {
    ...typography.caption1,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ─── Food grid ───
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gridCardImage: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
  },
  gridCardImagePlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardBody: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
  },
  gridCardName: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 2,
  },
  gridCardKcal: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Detail modal ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  detailSheetContainer: {
    maxHeight: '88%',
  },
  detailSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    maxHeight: '100%',
  },
  detailSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  detailSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailSheetImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },

  // Nutrition table
  nutritionTable: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nutritionLabel: { fontSize: 13, fontWeight: '500' },
  nutritionValue: { fontSize: 13, fontWeight: '600' },
  nutritionDivider: { height: StyleSheet.hairlineWidth },
  nutritionUnit: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  // Expanded
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  portionInput: { width: 72, textAlign: 'center', padding: spacing.sm },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E9E5D8',
    backgroundColor: '#FFF9EC',
  },
  presetChipActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  presetText: { fontSize: 13, color: '#66766F', fontWeight: '500' },
  presetTextActive: { color: palette.primaryDark, fontWeight: '600' },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  addButton: {
    backgroundColor: palette.accent,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addButtonText: { color: palette.white, fontSize: 15, fontWeight: '600' },

  // Cart / Footer
  footerContainer: { marginTop: spacing.lg },
  divider: { height: 1, marginBottom: spacing.lg },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cartEmoji: { fontSize: 20 },
  removeButton: { padding: spacing.sm },
  removeButtonText: { fontSize: 16, color: palette.error, fontWeight: '600' },
});
