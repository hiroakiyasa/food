import { useEffect, useMemo, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useMealStore } from '@/src/stores/mealStore';
import { useCreateMeal, useMealById, useDeleteMeal } from '@/src/hooks/useMeals';
import { generateId } from '@/src/lib/localDb';
import { uploadMealImage } from '@/src/lib/storage';
import { analyzeFoodImage } from '@/src/services/ai/analyzeMeal';
import { useAuthStore } from '@/src/stores/authStore';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { TrafficLightBadge, getItemTrafficLight } from '@/src/components/ui/TrafficLightBadge';
import { MetabolicPredictionCard } from '@/src/components/meal/MetabolicPredictionCard';
import { FoodScoreChip } from '@/src/components/meal/FoodScoreChip';
import { ScoreBreakdownSheet } from '@/src/components/meal/ScoreBreakdownSheet';
import { useMealScore } from '@/src/hooks/useFoodScore';
import { useMetabolicPrediction } from '@/src/hooks/useMetabolicPrediction';
import { formatCalories } from '@/src/utils/formatters';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

function ExistingMealView({ id }: { id: string }) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: meal, isLoading } = useMealById(id);
  const deleteMeal = useDeleteMeal();
  const prediction = useMetabolicPrediction(meal?.meal_items ?? []);
  const mealScore = useMealScore(meal?.meal_items ?? []);
  const [scoreSheetVisible, setScoreSheetVisible] = useState(false);

  const handleDelete = () => {
    Alert.alert('食事を削除', 'この食事記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal.mutateAsync(id);
            router.dismiss();
          } catch (err) {
            Alert.alert('削除エラー', (err as Error).message);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!meal) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <Text style={[typography.body, { color: c.textSecondary }]}>食事が見つかりません</Text>
      </View>
    );
  }

  const totalEnergy = meal.total_energy_kcal ?? 0;
  const totalProtein = meal.total_protein_g ?? 0;
  const totalFat = meal.total_fat_g ?? 0;
  const totalCarbs = meal.total_carbohydrate_g ?? 0;
  const totalFiber = meal.total_fiber_g ?? 0;
  const totalSalt = (meal.total_sodium_mg ?? 0) * 2.54 / 1000;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Meal image */}
      {meal.image_url && (
        <Image
          source={{ uri: meal.image_url }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      )}

      {/* Meal type & score header */}
      <View style={styles.mealHeader}>
        <View style={[styles.mealTypeTag, { backgroundColor: palette.primary }]}>
          <Text style={[typography.caption2, { color: palette.white, fontWeight: '600' }]}>
            {MEAL_TYPE_LABELS[meal.meal_type as MealType] ?? meal.meal_type}
          </Text>
        </View>
        {mealScore && (
          <Pressable
            onPress={() => setScoreSheetVisible(true)}
            style={({ pressed: p }) => [pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel={`食品スコア${mealScore.grade}、詳細を見る`}
          >
            <FoodScoreChip grade={mealScore.grade} value={mealScore.value} />
          </Pressable>
        )}
        {meal.traffic_light_overall && (
          <TrafficLightBadge
            color={meal.traffic_light_overall as 'green' | 'amber' | 'red'}
            size={12}
          />
        )}
      </View>

      {/* Score breakdown sheet */}
      {mealScore && (
        <ScoreBreakdownSheet
          visible={scoreSheetVisible}
          onClose={() => setScoreSheetVisible(false)}
          score={mealScore}
          isDark={isDark}
        />
      )}

      {/* Total PFC card */}
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginHorizontal: spacing.xl }]}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>TOTAL NUTRITION</Text>
        <Text style={[typography.number, { color: palette.primary, marginBottom: spacing.md }]}>
          {formatCalories(totalEnergy)}
        </Text>
        <View style={styles.pfcRow}>
          {[
            { label: 'P', value: totalProtein, color: palette.protein },
            { label: 'F', value: totalFat, color: palette.fat },
            { label: 'C', value: totalCarbs, color: palette.carbs },
            { label: 'Fiber', value: totalFiber, color: palette.fiber },
          ].map((n) => (
            <View key={n.label} style={styles.pfcItem}>
              <Text style={[typography.numberSmall, { color: n.color }]}>
                {n.value.toFixed(1)}g
              </Text>
              <Text style={[typography.caption2, { color: c.textMuted }]}>{n.label}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.saltSummary, { backgroundColor: c.surfaceAlt }]}>
          <FontAwesome name="tint" size={14} color={palette.sky} />
          <Text style={[typography.caption1, { color: c.textSecondary }]}>食塩相当量</Text>
          <Text style={[typography.bodyBold, { color: c.text }]}>{totalSalt.toFixed(2)}g</Text>
        </View>
      </View>

      {/* Meal items */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary, marginHorizontal: spacing.xl, marginTop: spacing.xl }]}>
        ITEMS
      </Text>
      {meal.meal_items.map((item) => {
        const trafficColor = getItemTrafficLight(item);
        return (
          <View
            key={item.id}
            style={[commonStyles.cardCompact, { backgroundColor: c.surface, marginHorizontal: spacing.xl, marginBottom: spacing.sm }]}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemNameRow}>
                <TrafficLightBadge color={trafficColor} size={10} />
                <Text style={[typography.bodyBold, { color: c.text }]}>
                  {item.ai_detected_name}
                </Text>
              </View>
              {item.portion_grams && (
                <Text style={[typography.caption1, { color: c.textMuted }]}>
                  {item.portion_grams}g
                </Text>
              )}
            </View>
            <View style={styles.itemNutrients}>
              <Text style={[typography.caption1, { color: c.text, fontWeight: '700' }]}>
                {Math.round(item.energy_kcal ?? 0)} kcal
              </Text>
              <Text style={[typography.caption2, { color: palette.protein }]}>
                P {(item.protein_g ?? 0).toFixed(1)}g
              </Text>
              <Text style={[typography.caption2, { color: palette.fat }]}>
                F {(item.fat_g ?? 0).toFixed(1)}g
              </Text>
              <Text style={[typography.caption2, { color: palette.carbs }]}>
                C {(item.carbohydrate_g ?? 0).toFixed(1)}g
              </Text>
              <Text style={[typography.caption2, { color: palette.sky }]}>
                塩 {((item.sodium_mg ?? 0) * 2.54 / 1000).toFixed(2)}g
              </Text>
            </View>
          </View>
        );
      })}

      {/* Metabolic prediction */}
      {prediction && (
        <View style={{ marginHorizontal: spacing.xl, marginTop: spacing.md }}>
          <MetabolicPredictionCard prediction={prediction} isDark={isDark} />
        </View>
      )}

      {/* Nutrition balance link */}
      <Pressable
        onPress={() => {
          const eatenDate = meal.eaten_at.split('T')[0];
          router.push(`/(modals)/nutrition-balance?mealId=${id}&date=${eatenDate}`);
        }}
        style={({ pressed: p }) => [
          commonStyles.buttonSecondary,
          { marginHorizontal: spacing.xl, marginTop: spacing.lg },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel="栄養バランスを見る"
      >
        <Text style={[typography.bodyBold, { color: palette.primary }]}>
          栄養バランスを見る →
        </Text>
      </Pressable>

      {/* Delete button */}
      <Pressable
        onPress={handleDelete}
        style={({ pressed: p }) => [
          commonStyles.buttonDestructive,
          { marginHorizontal: spacing.xl, marginTop: spacing.xl },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel="この食事を削除"
      >
        <Text style={[commonStyles.buttonText, { color: palette.error }]}>この食事を削除</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function MealDetailModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);

  const user = useAuthStore((s) => s.user);
  const {
    pendingMeal,
    setAnalysis,
    setAnalysisItemPortion,
    removeAnalysisItem,
    setError,
    clearPending,
  } = useMealStore();
  const createMeal = useCreateMeal();
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    () => pendingMeal?.mealType ?? 'lunch',
  );
  const [saving, setSaving] = useState(false);
  const analysisTotals = useMemo(() => (
    pendingMeal?.analysis?.items.reduce(
      (acc, item) => ({
        energy_kcal: acc.energy_kcal + item.energy_kcal,
        protein_g: acc.protein_g + item.protein_g,
        fat_g: acc.fat_g + item.fat_g,
        carbohydrate_g: acc.carbohydrate_g + item.carbohydrate_g,
        fiber_g: acc.fiber_g + item.fiber_g,
        sodium_mg: acc.sodium_mg + item.sodium_mg,
        salt_equivalent_g: acc.salt_equivalent_g + item.salt_equivalent_g,
      }),
      {
        energy_kcal: 0,
        protein_g: 0,
        fat_g: 0,
        carbohydrate_g: 0,
        fiber_g: 0,
        sodium_mg: 0,
        salt_equivalent_g: 0,
      },
    ) ?? null
  ), [pendingMeal?.analysis?.items]);
  const analysisItemCount = pendingMeal?.analysis?.items.length ?? 0;

  useEffect(() => {
    if (pendingMeal?.isAnalyzing && pendingMeal.imageBase64) {
      analyzeMealImage(pendingMeal.imageBase64);
    }
  }, [pendingMeal?.isAnalyzing]);

  const analyzeMealImage = async (base64: string) => {
    try {
      const analysis = await analyzeFoodImage(base64);
      setAnalysis(analysis);
      if (!pendingMeal?.mealType && analysis.meal_type_guess) {
        const guess = analysis.meal_type_guess as MealType;
        if (MEAL_TYPES.includes(guess)) {
          setSelectedMealType(guess);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSave = async () => {
    if (!pendingMeal?.analysis || !user) return;

    setSaving(true);
    try {
      const mealId = generateId();
      let imageUrl: string | undefined;

      if (pendingMeal.imageBase64) {
        imageUrl = await uploadMealImage(user.id, mealId, pendingMeal.imageBase64);
      }

      const analysis = pendingMeal.analysis;
      const totals = analysisTotals;
      if (!totals || analysis.items.length === 0) {
        throw new Error('保存する食品がありません');
      }

      await createMeal.mutateAsync({
        meal: {
          id: mealId,
          meal_type: selectedMealType,
          eaten_at: new Date().toISOString(),
          image_url: imageUrl ?? null,
          total_energy_kcal: totals.energy_kcal,
          total_protein_g: totals.protein_g,
          total_fat_g: totals.fat_g,
          total_carbohydrate_g: totals.carbohydrate_g,
          total_fiber_g: totals.fiber_g,
          total_sodium_mg: totals.sodium_mg,
          notes: `写真解析: ${analysis.analysis_source ?? 'AI'} / ${analysis.items.filter((item) => item.estimate_basis === 'database').length}件DB照合`,
        },
        items: analysis.items.map((item) => ({
          food_item_id: item.food_item_id ?? null,
          ai_detected_name: item.name,
          portion_grams: item.portion_grams,
          confidence: item.confidence,
          energy_kcal: item.energy_kcal,
          protein_g: item.protein_g,
          fat_g: item.fat_g,
          carbohydrate_g: item.carbohydrate_g,
          fiber_g: item.fiber_g,
          sodium_mg: item.sodium_mg,
        })),
      });

      clearPending();
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Existing meal view
  if (id) {
    return <ExistingMealView id={id} />;
  }

  // No pending meal
  if (!pendingMeal) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <Text style={[typography.body, { color: c.textSecondary, padding: spacing.xl }]}>
          データがありません
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Photo */}
      {pendingMeal.imageUri && (
        <Image
          source={{ uri: pendingMeal.imageUri }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      )}

      {/* Loading state */}
      {pendingMeal.isAnalyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[typography.bodyBold, { color: c.text }]}>写真から料理を見つけています</Text>
          <Text style={[typography.caption1, { color: c.textMuted }]}>食品データベースと栄養値を照合中...</Text>
        </View>
      )}

      {/* Error state */}
      {pendingMeal.error && (
        <View style={styles.errorContainer}>
          <Text style={[typography.body, { color: palette.error, marginBottom: spacing.md }]}>
            {pendingMeal.error}
          </Text>
          <Pressable
            onPress={() => {
              if (pendingMeal.imageBase64) {
                useMealStore.getState().setAnalyzing(true);
                analyzeMealImage(pendingMeal.imageBase64);
              }
            }}
            style={({ pressed: p }) => [
              commonStyles.buttonPrimary,
              { backgroundColor: palette.accent },
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel="再試行"
          >
            <Text style={commonStyles.buttonText}>再試行</Text>
          </Pressable>
        </View>
      )}

      {/* Analysis results */}
      {pendingMeal.analysis && (
        <>
          {/* Meal type selector */}
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
                accessibilityRole="button"
                accessibilityLabel={MEAL_TYPE_LABELS[type]}
                accessibilityState={{ selected: selectedMealType === type }}
              >
                <Text
                  style={[
                    commonStyles.chipText,
                    selectedMealType === type && commonStyles.chipTextActive,
                  ]}
                >
                  {MEAL_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          {analysisTotals && (
            <View style={[commonStyles.card, styles.analysisSummary, { backgroundColor: c.surface }]}>
              <View style={styles.analysisSummaryHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>写真からの栄養推定</Text>
                  <Text style={[typography.heroNumber, { color: palette.primaryDark }]}>
                    {Math.round(analysisTotals.energy_kcal)}
                    <Text style={typography.heroUnit}> kcal</Text>
                  </Text>
                </View>
                <View style={styles.saltBubble}>
                  <FontAwesome name="tint" size={17} color={palette.sky} />
                  <Text style={[typography.caption2, { color: c.textMuted }]}>食塩相当量</Text>
                  <Text style={[typography.title3, { color: c.text }]}>{analysisTotals.salt_equivalent_g.toFixed(2)}g</Text>
                </View>
              </View>
              <View style={styles.summaryMacroRow}>
                {[
                  { label: 'たんぱく質', value: analysisTotals.protein_g, color: palette.protein },
                  { label: '脂質', value: analysisTotals.fat_g, color: palette.fat },
                  { label: '炭水化物', value: analysisTotals.carbohydrate_g, color: palette.carbs },
                  { label: '食物繊維', value: analysisTotals.fiber_g, color: palette.fiber },
                ].map((macro) => (
                  <View key={macro.label} style={styles.summaryMacroItem}>
                    <Text style={[typography.bodyBold, { color: macro.color }]}>{macro.value.toFixed(1)}g</Text>
                    <Text style={[typography.caption2, { color: c.textMuted }]}>{macro.label}</Text>
                  </View>
                ))}
              </View>
              {pendingMeal.analysis.summary && (
                <Text style={[typography.body, styles.analysisCopy, { color: c.textSecondary }]}>
                  {pendingMeal.analysis.summary}
                </Text>
              )}
              <View style={[styles.databaseCoverage, { backgroundColor: palette.primaryLight }]}>
                <FontAwesome name="database" size={14} color={palette.primaryDark} />
                <Text style={[typography.caption1, { color: palette.primaryDark }]}>
                  {pendingMeal.analysis.items.filter((item) => item.estimate_basis === 'database' || item.estimate_basis === 'mock').length}
                  /{pendingMeal.analysis.items.length}品を食品データと照合
                </Text>
              </View>
            </View>
          )}

          {/* Items with traffic light */}
          {pendingMeal.analysis.items.map((item, i) => {
            const trafficColor = getItemTrafficLight({
              energy_kcal: item.energy_kcal,
              fat_g: item.fat_g,
              sodium_mg: item.sodium_mg,
              carbohydrate_g: item.carbohydrate_g,
              portion_grams: item.portion_grams,
            });
            return (
              <View
                key={`${item.food_item_id ?? item.name}-${i}`}
                style={[commonStyles.cardCompact, { backgroundColor: c.surface, marginHorizontal: spacing.xl, marginBottom: spacing.sm }]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemNameRow}>
                    <TrafficLightBadge color={trafficColor} size={10} />
                    <View style={styles.itemTitleBlock}>
                      <Text style={[typography.bodyBold, { color: c.text }]}>{item.name}</Text>
                      {item.detected_name && item.detected_name !== item.name && (
                        <Text style={[typography.caption2, { color: c.textMuted }]}>写真判定: {item.detected_name}</Text>
                      )}
                    </View>
                  </View>
                  <View style={[
                    styles.sourceBadge,
                    { backgroundColor: item.estimate_basis === 'ai_estimate' ? '#FFF2DB' : palette.primaryLight },
                  ]}>
                    <Text style={[
                      typography.caption2,
                      { color: item.estimate_basis === 'ai_estimate' ? '#9A5D12' : palette.primaryDark },
                    ]}>
                      {item.estimate_basis === 'ai_estimate' ? 'AI概算' : '食品DB'}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemNutrients}>
                  <Text style={[typography.caption1, { color: c.text, fontWeight: '700' }]}>
                    {Math.round(item.energy_kcal)} kcal
                  </Text>
                  <Text style={[typography.caption2, { color: palette.protein }]}>
                    P {item.protein_g.toFixed(1)}g
                  </Text>
                  <Text style={[typography.caption2, { color: palette.fat }]}>
                    F {item.fat_g.toFixed(1)}g
                  </Text>
                  <Text style={[typography.caption2, { color: palette.carbs }]}>
                    C {item.carbohydrate_g.toFixed(1)}g
                  </Text>
                  <Text style={[typography.caption2, { color: palette.sky }]}>
                    塩 {item.salt_equivalent_g.toFixed(2)}g
                  </Text>
                </View>
                <View style={styles.portionEditor}>
                  <Text style={[typography.caption1, { color: c.textSecondary }]}>推定量</Text>
                  <Pressable
                    onPress={() => setAnalysisItemPortion(i, item.portion_grams - 10)}
                    style={({ pressed: p }) => [styles.portionButton, { backgroundColor: c.surfaceAlt }, pressed(p)]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}を10グラム減らす`}
                  >
                    <Text style={[typography.title3, { color: c.text }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.portionValue, { color: c.text }]}>{Math.round(item.portion_grams)}g</Text>
                  <Pressable
                    onPress={() => setAnalysisItemPortion(i, item.portion_grams + 10)}
                    style={({ pressed: p }) => [styles.portionButton, { backgroundColor: c.surfaceAlt }, pressed(p)]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}を10グラム増やす`}
                  >
                    <Text style={[typography.title3, { color: c.text }]}>＋</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeAnalysisItem(i)}
                    style={({ pressed: p }) => [styles.removeButton, pressed(p)]}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}を削除`}
                  >
                    <FontAwesome name="trash-o" size={18} color={palette.error} />
                  </Pressable>
                </View>
                <View style={[styles.confidenceBar, { backgroundColor: c.surfaceAlt }]}>
                  <View
                    style={[styles.confidenceFill, { width: `${item.confidence * 100}%` }]}
                  />
                </View>
                <Text style={[styles.confidenceLabel, { color: c.textMuted }]}>
                  写真判定 {Math.round(item.confidence * 100)}%
                  {item.database_source ? ` ・ ${item.database_source.toUpperCase()}` : ''}
                </Text>
              </View>
            );
          })}

          {/* Save button */}
          {pendingMeal.analysis.disclaimer && (
            <Text style={[styles.disclaimer, { color: c.textMuted }]}>
              {pendingMeal.analysis.disclaimer}
            </Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={saving || analysisItemCount === 0}
            style={({ pressed: p }) => [
              commonStyles.buttonPrimary,
              { marginHorizontal: spacing.xl, marginTop: spacing.md },
              (saving || analysisItemCount === 0) && { opacity: 0.6 },
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel={saving ? '保存中' : '保存する'}
          >
            <Text style={[commonStyles.buttonText, { fontSize: 18 }]}>
              {saving ? '保存中...' : '保存する'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  image: { width: '100%', height: 250, resizeMode: 'cover' },
  loadingContainer: { alignItems: 'center', padding: spacing['4xl'], gap: spacing.md },
  errorContainer: { alignItems: 'center', padding: spacing.xl },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  mealTypeTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  sectionLabel: {
    ...commonStyles.sectionHeader,
  },
  pfcRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pfcItem: { alignItems: 'center', gap: 2 },
  saltSummary: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  itemTitleBlock: { flex: 1, gap: 2 },
  itemNutrients: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  confidenceBar: {
    height: 3,
    borderRadius: 2,
  },
  confidenceFill: {
    height: 3,
    backgroundColor: palette.primary,
    borderRadius: 2,
  },
  analysisSummary: { marginHorizontal: spacing.xl, marginBottom: spacing.lg },
  analysisSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saltBubble: {
    minWidth: 96,
    alignItems: 'center',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.accentLight,
  },
  summaryMacroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  summaryMacroItem: { alignItems: 'center', flex: 1, gap: 2 },
  analysisCopy: { marginTop: spacing.lg },
  databaseCoverage: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full },
  portionEditor: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  portionButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  portionValue: { ...typography.bodyBold, minWidth: 48, textAlign: 'center' },
  removeButton: { marginLeft: 'auto', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  confidenceLabel: { ...typography.caption2, textAlign: 'right', marginTop: 5 },
  disclaimer: { ...typography.caption2, marginHorizontal: spacing.xl, lineHeight: 17 },
});
