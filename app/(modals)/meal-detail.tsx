import { useEffect, useState } from 'react';
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
import { supabase } from '@/src/lib/supabase';
import { uploadMealImage } from '@/src/lib/storage';
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
  const { pendingMeal, setAnalysis, setError, clearPending } = useMealStore();
  const createMeal = useCreateMeal();
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pendingMeal?.isAnalyzing && pendingMeal.imageBase64) {
      analyzeMealImage(pendingMeal.imageBase64);
    }
  }, [pendingMeal?.isAnalyzing]);

  const analyzeMealImage = async (base64: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-image', {
        body: { image_base64: base64 },
      });
      if (error) throw error;
      setAnalysis(data);
      if (data.meal_type_guess) {
        const guess = data.meal_type_guess as MealType;
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
      const totals = analysis.items.reduce(
        (acc, item) => ({
          energy_kcal: acc.energy_kcal + item.energy_kcal,
          protein_g: acc.protein_g + item.protein_g,
          fat_g: acc.fat_g + item.fat_g,
          carbohydrate_g: acc.carbohydrate_g + item.carbohydrate_g,
          fiber_g: acc.fiber_g + item.fiber_g,
          sodium_mg: acc.sodium_mg + item.sodium_mg,
        }),
        { energy_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0, fiber_g: 0, sodium_mg: 0 },
      );

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
        },
        items: analysis.items.map((item) => ({
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
          <Text style={[typography.body, { color: c.textMuted }]}>AI解析中...</Text>
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
                key={i}
                style={[commonStyles.cardCompact, { backgroundColor: c.surface, marginHorizontal: spacing.xl, marginBottom: spacing.sm }]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemNameRow}>
                    <TrafficLightBadge color={trafficColor} size={10} />
                    <Text style={[typography.bodyBold, { color: c.text }]}>{item.name}</Text>
                  </View>
                  <Text style={[typography.caption1, { color: c.textMuted }]}>
                    ~{item.portion_grams}g
                  </Text>
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
                </View>
                <View style={[styles.confidenceBar, { backgroundColor: c.surfaceAlt }]}>
                  <View
                    style={[styles.confidenceFill, { width: `${item.confidence * 100}%` }]}
                  />
                </View>
              </View>
            );
          })}

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed: p }) => [
              commonStyles.buttonPrimary,
              { marginHorizontal: spacing.xl, marginTop: spacing.md },
              saving && { opacity: 0.6 },
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
});
