import { useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { WeeklyCalendarStrip } from '@/src/components/home/WeeklyCalendarStrip';
import { JoyfulProgressRing } from '@/src/components/joyful/JoyfulProgressRing';
import { MealSectionCard } from '@/src/components/record/MealSectionCard';
import { QuickAddBar } from '@/src/components/record/QuickAddBar';
import { DailyCoachCard } from '@/src/components/coaching/DailyCoachCard';
import { OfflineIndicator } from '@/src/components/ui/OfflineIndicator';
import { useDailySummary } from '@/src/hooks/useDailySummary';
import { useCreateMeal, useMealsByDate } from '@/src/hooks/useMeals';
import { useNutritionTargets } from '@/src/hooks/useNutritionTargets';
import { MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import {
  commonStyles,
  palette,
  pressed,
  radius,
  shadow,
  spacing,
  typography,
  useThemeColors,
} from '@/src/lib/theme';
import { useUIStore } from '@/src/stores/uiStore';
import { formatDateFull, getToday } from '@/src/utils/formatters';
import { useColorScheme } from '@/components/useColorScheme';

const DISPLAY_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export default function RecordScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = useThemeColors(isDark);
  const { selectedDate, setSelectedDate } = useUIStore();
  const {
    data: meals = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useMealsByDate(selectedDate);
  const { data: nutritionTargets } = useNutritionTargets();
  const { data: dailySummary } = useDailySummary(selectedDate);
  const router = useRouter();
  const today = getToday();
  const previousDate = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }, [selectedDate]);
  const { data: previousMeals = [] } = useMealsByDate(previousDate);
  const createMeal = useCreateMeal();

  const repeatMeal = async (source: (typeof previousMeals)[number]) => {
    const sourceTime = source.eaten_at.split('T')[1] ?? '12:00:00';
    await createMeal.mutateAsync({
      meal: {
        meal_type: source.meal_type,
        eaten_at: `${selectedDate}T${sourceTime}`,
        image_url: source.image_url,
        total_energy_kcal: source.total_energy_kcal,
        total_protein_g: source.total_protein_g,
        total_fat_g: source.total_fat_g,
        total_carbohydrate_g: source.total_carbohydrate_g,
        total_fiber_g: source.total_fiber_g,
        total_sodium_mg: source.total_sodium_mg,
        notes: `前日の記録からコピー${source.notes ? ` / ${source.notes}` : ''}`,
      },
      items: source.meal_items.map((item) => ({
        food_item_id: item.food_item_id,
        commercial_product_id: item.commercial_product_id,
        ai_detected_name: item.ai_detected_name,
        portion_grams: item.portion_grams,
        confidence: item.confidence,
        energy_kcal: item.energy_kcal,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbohydrate_g: item.carbohydrate_g,
        fiber_g: item.fiber_g,
        sodium_mg: item.sodium_mg,
        estimate_basis: item.estimate_basis,
        database_source: item.database_source,
        portion_min_grams: item.portion_min_grams,
        portion_max_grams: item.portion_max_grams,
        energy_min_kcal: item.energy_min_kcal,
        energy_max_kcal: item.energy_max_kcal,
        salt_equivalent_g: item.salt_equivalent_g,
        hidden_ingredient_flags: item.hidden_ingredient_flags,
      })),
    });
  };

  const totals = useMemo(() => meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + (meal.total_energy_kcal ?? 0),
      protein: sum.protein + (meal.total_protein_g ?? 0),
      fat: sum.fat + (meal.total_fat_g ?? 0),
      carbs: sum.carbs + (meal.total_carbohydrate_g ?? 0),
      fiber: sum.fiber + (meal.total_fiber_g ?? 0),
      sodium: sum.sodium + (meal.total_sodium_mg ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 },
  ), [meals]);

  const targetCalories = nutritionTargets?.energy_kcal ?? 2000;
  const calorieProgress = targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0;
  const remainingCalories = Math.max(0, targetCalories - totals.calories);
  const score = dailySummary?.daily_score ?? Math.min(100, Math.round(calorieProgress));

  const mealsByType = useMemo(() => DISPLAY_ORDER.reduce(
    (result, type) => {
      result[type] = meals.filter((meal) => meal.meal_type === type);
      return result;
    },
    {} as Record<MealType, typeof meals>,
  ), [meals]);

  const mealCountByDate = useMemo(
    () => ({ [selectedDate]: meals.length }),
    [meals.length, selectedDate],
  );

  const showAddOptions = (mealType: MealType) => {
    const options = ['写真で記録', '食品を検索', 'AIに話す', 'バーコード', 'キャンセル'];
    const open = (index: number) => {
      const query = `?mealType=${mealType}`;
      if (index === 0) router.push(`/(modals)/camera${query}` as never);
      if (index === 1) router.push(`/(modals)/food-search${query}` as never);
      if (index === 2) router.push(`/(modals)/chat-meal${query}` as never);
      if (index === 3) router.push(`/(modals)/barcode${query}` as never);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 4, title: `${MEAL_TYPE_LABELS[mealType]}を追加` },
        open,
      );
      return;
    }

    Alert.alert(`${MEAL_TYPE_LABELS[mealType]}を追加`, undefined, [
      { text: options[0], onPress: () => open(0) },
      { text: options[1], onPress: () => open(1) },
      { text: options[2], onPress: () => open(2) },
      { text: options[3], onPress: () => open(3) },
      { text: options[4], style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={(
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={palette.primary}
          colors={[palette.primary]}
        />
      )}
    >
      <OfflineIndicator />

      <View style={styles.dateHeading}>
        <View>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>MY FOOD JOURNAL</Text>
          <Text style={[styles.dateTitle, { color: colors.text }]}>{formatDateFull(selectedDate)}</Text>
        </View>
        {selectedDate !== today && (
          <Pressable
            onPress={() => setSelectedDate(today)}
            style={({ pressed: isPressed }) => [styles.todayButton, pressed(isPressed)]}
            accessibilityRole="button"
            accessibilityLabel="今日の記録へ戻る"
          >
            <Text style={styles.todayButtonText}>今日へ</Text>
          </Pressable>
        )}
      </View>

      <WeeklyCalendarStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        mealCountByDate={mealCountByDate}
        isDark={isDark}
      />

      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <JoyfulProgressRing
          value={calorieProgress}
          size={94}
          strokeWidth={11}
          label={`${Math.round(calorieProgress)}%`}
          accessibilityLabel="1日のカロリー目標の達成率"
        />
        <View style={styles.summaryMain}>
          <Text style={[styles.calorieNumber, { color: colors.text }]}>
            {Math.round(totals.calories).toLocaleString('ja-JP')}
            <Text style={styles.calorieUnit}> kcal</Text>
          </Text>
          <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
            あと <Text style={styles.remainingNumber}>{Math.round(remainingCalories)}</Text> kcal
          </Text>
          <View style={styles.macroRow}>
            <Text style={[styles.macro, { color: palette.protein }]}>P {totals.protein.toFixed(0)}g</Text>
            <Text style={[styles.macro, { color: palette.fat }]}>F {totals.fat.toFixed(0)}g</Text>
            <Text style={[styles.macro, { color: palette.carbs }]}>C {totals.carbs.toFixed(0)}g</Text>
          </View>
        </View>
        <View style={styles.scoreColumn}>
          <View style={styles.scoreBadge}>
            <FontAwesome name="leaf" size={16} color={palette.primary} />
            <Text style={styles.scoreText}>{score}</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>今日のスコア</Text>
        </View>
      </View>

      <DailyCoachCard
        totals={{ calories: totals.calories, protein: totals.protein, fiber: totals.fiber, sodium: totals.sodium }}
        targets={{
          calories: targetCalories,
          protein: nutritionTargets?.protein_g ?? 75,
          fiber: nutritionTargets?.fiber_g ?? 21,
          sodium: nutritionTargets?.sodium_mg ?? 2600,
        }}
        isDark={isDark}
      />

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={palette.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>食事記録を読み込んでいます</Text>
        </View>
      ) : isError ? (
        <Pressable
          onPress={() => refetch()}
          style={({ pressed: isPressed }) => [styles.stateCard, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="食事記録を再読み込み"
        >
          <FontAwesome name="refresh" size={22} color={palette.error} />
          <Text style={[styles.stateText, { color: colors.text }]}>読み込めませんでした。タップして再試行</Text>
        </Pressable>
      ) : (
        <View style={styles.timelineList}>
          {DISPLAY_ORDER.map((type) => (
            <MealSectionCard
              key={type}
              mealType={type}
              meals={mealsByType[type]}
              onAdd={() => showAddOptions(type)}
              isDark={isDark}
            />
          ))}
        </View>
      )}

      <View style={styles.quickSection}>
        <View style={styles.quickHeading}>
          <View>
            <Text style={[styles.quickTitle, { color: colors.text }]}>食事を記録する</Text>
            <Text style={[styles.quickSubtitle, { color: colors.textSecondary }]}>いちばん楽な方法を選んでください</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(modals)/recipe-import' as never)}
            style={({ pressed: isPressed }) => [styles.barcodeButton, pressed(isPressed)]}
            accessibilityRole="button"
            accessibilityLabel="レシピURLを取り込む"
          >
            <FontAwesome name="book" size={18} color={palette.warning} />
          </Pressable>
        </View>
        <QuickAddBar isDark={isDark} />
        {previousMeals.length > 0 && (
          <View style={styles.repeatBlock}>
            <Text style={[styles.repeatTitle, { color: colors.text }]}>昨日と同じものをすぐ記録</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.repeatRow}>
              {previousMeals.slice(0, 6).map((meal) => (
                <Pressable
                  key={meal.id}
                  onPress={() => void repeatMeal(meal)}
                  disabled={createMeal.isPending}
                  style={({ pressed: isPressed }) => [
                    styles.repeatChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed(isPressed),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${MEAL_TYPE_LABELS[meal.meal_type as MealType]}を昨日と同じ内容で記録`}
                >
                  <FontAwesome name="repeat" size={13} color={palette.primary} />
                  <Text style={[styles.repeatChipText, { color: colors.text }]} numberOfLines={1}>
                    {meal.meal_items.map((item) => item.ai_detected_name).join('・') || MEAL_TYPE_LABELS[meal.meal_type as MealType]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    ...commonStyles.scrollContent,
    paddingTop: spacing.lg,
  },
  dateHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.caption2,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  dateTitle: {
    ...typography.title2,
    marginTop: 2,
  },
  todayButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: { color: palette.primaryDark, fontWeight: '700' },
  summaryCard: {
    minHeight: 142,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.md,
  },
  summaryMain: { flex: 1, gap: 3 },
  calorieNumber: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.2,
  },
  calorieUnit: { fontSize: 16, fontWeight: '700' },
  remainingText: { ...typography.bodyBold },
  remainingNumber: { color: palette.apricot, fontSize: 22, fontWeight: '800' },
  macroRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  macro: { fontSize: 11, fontWeight: '700' },
  scoreColumn: { alignItems: 'center', gap: 4 },
  scoreBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: palette.primaryDark, fontSize: 16, fontWeight: '800' },
  scoreLabel: { ...typography.caption2, textAlign: 'center' },
  timelineList: { marginHorizontal: -2 },
  stateCard: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateText: { ...typography.body, textAlign: 'center' },
  quickSection: { marginTop: spacing.lg },
  repeatBlock: { marginTop: spacing.lg, gap: spacing.sm },
  repeatTitle: { ...typography.bodyBold },
  repeatRow: { gap: spacing.sm, paddingRight: spacing.xl },
  repeatChip: {
    maxWidth: 220,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  repeatChipText: { ...typography.caption1, flexShrink: 1 },
  quickHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  quickTitle: { ...typography.title2 },
  quickSubtitle: { ...typography.caption1, marginTop: 2 },
  barcodeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
