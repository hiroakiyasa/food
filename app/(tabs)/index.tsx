import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile } from '@/src/hooks/useProfile';
import { useMealsByDate } from '@/src/hooks/useMeals';
import { useNutritionTargets } from '@/src/hooks/useNutritionTargets';
import { useDailySummary } from '@/src/hooks/useDailySummary';
import { useWeeklyBuffer } from '@/src/hooks/useWeeklyBuffer';
import { useSuggestions, useDismissSuggestion } from '@/src/hooks/useSuggestions';
import { SuggestionCard } from '@/src/components/suggestion/SuggestionCard';
import { OfflineIndicator } from '@/src/components/ui/OfflineIndicator';
import { WeeklyCalendarStrip } from '@/src/components/home/WeeklyCalendarStrip';
import { HeroCalorieCard } from '@/src/components/home/HeroCalorieCard';
import { QuickStatsGrid } from '@/src/components/home/QuickStatsGrid';
import { NutritionSummaryCard } from '@/src/components/home/NutritionSummaryCard';
import { MealTimelineCard } from '@/src/components/home/MealTimelineCard';
import { FastingTimerCard } from '@/src/components/home/FastingTimerCard';
import { FocusNutrientsCard } from '@/src/components/home/FocusNutrientsCard';
import { StreakBadge } from '@/src/components/home/StreakBadge';
import { useActiveConditions } from '@/src/hooks/useActiveConditions';
import { useFocusNutrientValues } from '@/src/hooks/useFocusNutrientValues';
import { getToday, formatDateFull } from '@/src/utils/formatters';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

export default function HomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const today = getToday();
  const { data: profile } = useProfile();
  const { data: meals = [] } = useMealsByDate(today);
  const { data: nutritionTargets } = useNutritionTargets();
  const { data: dailySummary } = useDailySummary(today);
  const { data: weeklyBuffer } = useWeeklyBuffer(today);
  const { data: suggestions = [] } = useSuggestions(2);
  const dismissSuggestion = useDismissSuggestion();
  const { focusNutrients } = useActiveConditions();
  const focusValueMap = useFocusNutrientValues(focusNutrients, today);
  const router = useRouter();

  const totalCalories = meals.reduce((sum, m) => sum + (m.total_energy_kcal ?? 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.total_fat_g ?? 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.total_carbohydrate_g ?? 0), 0);
  const totalFiber = meals.reduce((sum, m) => sum + (m.total_fiber_g ?? 0), 0);

  const targetCalories = nutritionTargets?.energy_kcal ?? 2000;
  const targetProtein = nutritionTargets?.protein_g ?? 60;
  const targetFat = nutritionTargets?.fat_g ?? 55;
  const targetCarbs = nutritionTargets?.carbohydrate_g ?? 300;
  const targetFiber = nutritionTargets?.fiber_g ?? 20;

  const remainingCalories = targetCalories - totalCalories;

  const bufferTotalKcal = weeklyBuffer?.buffer_total_kcal ?? 0;
  const bufferUsedKcal = weeklyBuffer?.buffer_used_kcal ?? 0;
  const bufferRemainingKcal = Math.max(0, bufferTotalKcal - bufferUsedKcal);
  const bufferPercent = bufferTotalKcal > 0 ? (bufferUsedKcal / bufferTotalKcal) * 100 : 0;

  // Build meal count map for calendar strip
  const mealCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    map[today] = meals.length;
    return map;
  }, [meals.length, today]);

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 10) return 'おはようございます';
    if (hour < 17) return 'こんにちは';
    return 'こんばんは';
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <OfflineIndicator />

      {/* Weekly Calendar Strip */}
      <WeeklyCalendarStrip
        selectedDate={today}
        onSelectDate={() => {}}
        mealCountByDate={mealCountByDate}
        isDark={isDark}
      />

      {/* Greeting + Streak */}
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          {profile?.display_name ? (
            <>
              <Text style={[styles.greetingName, { color: c.text }]} numberOfLines={1}>
                {profile.display_name}さん
              </Text>
              <Text style={[styles.greetingSub, { color: c.textSecondary }]} numberOfLines={1}>
                {greeting}
              </Text>
            </>
          ) : (
            <Text style={[styles.greetingName, { color: c.text }]} numberOfLines={1}>
              {greeting}
            </Text>
          )}
        </View>
        <StreakBadge isDark={isDark} />
      </View>

      {/* Hero Calorie Card */}
      <HeroCalorieCard
        currentCalories={totalCalories}
        targetCalories={targetCalories}
        score={dailySummary?.daily_score ?? null}
        feedbackMessage={dailySummary?.feedback_message ?? null}
        isDark={isDark}
        protein={totalProtein}
        fat={totalFat}
        carbs={totalCarbs}
        fiber={totalFiber}
        proteinTarget={targetProtein}
        fatTarget={targetFat}
        carbsTarget={targetCarbs}
        fiberTarget={targetFiber}
      />

      {/* Quick Stats */}
      <QuickStatsGrid
        remainingCalories={remainingCalories}
        steps={null}
        mealsCount={meals.length}
        isDark={isDark}
      />

      {/* Nutrition Summary Card */}
      <NutritionSummaryCard
        protein={totalProtein}
        fat={totalFat}
        carbs={totalCarbs}
        fiber={totalFiber}
        proteinTarget={targetProtein}
        fatTarget={targetFat}
        carbsTarget={targetCarbs}
        fiberTarget={targetFiber}
        isDark={isDark}
      />

      {/* Focus Nutrients Card */}
      <FocusNutrientsCard
        focusNutrients={focusNutrients}
        focusValueMap={focusValueMap}
        isDark={isDark}
        onSettingsPress={() => router.push('/(modals)/condition-select' as never)}
      />

      {/* Weekly Buffer */}
      {bufferTotalKcal > 0 && (
        <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.lg }]}>
          <View style={styles.bufferHeader}>
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
              WEEKLY BUFFER
            </Text>
            <Text style={[typography.caption1, { color: c.textMuted }]}>
              残り {Math.round(bufferRemainingKcal)} kcal
            </Text>
          </View>
          <View style={[styles.bufferBarBg, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.bufferBarFill, {
              width: `${Math.min(100, bufferPercent)}%`,
              backgroundColor: bufferPercent > 80 ? palette.error : bufferPercent > 50 ? palette.warning : palette.primary,
            }]} />
          </View>
          {bufferPercent >= 100 && (
            <Pressable
              onPress={() => router.push('/(modals)/recovery-plan' as never)}
              style={({ pressed: p }) => [styles.recoveryLink, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="リカバリープランを見る"
            >
              <Text style={styles.recoveryLinkText}>Recovery Plan →</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Fasting Timer */}
      <FastingTimerCard isDark={isDark} />

      {/* Today's Meals */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary, marginBottom: spacing.md }]}>
        TODAY'S MEALS
      </Text>
      <View style={{ marginBottom: spacing.lg }}>
        <MealTimelineCard meals={meals} isDark={isDark} />
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.sectionLabel, { color: c.textSecondary, marginBottom: spacing.md }]}>
            SUGGESTIONS
          </Text>
          {suggestions.map((s) => (
            <View key={s.id} style={{ marginBottom: spacing.md }}>
              <SuggestionCard
                suggestion={s}
                isDark={isDark}
                onDismiss={() => dismissSuggestion.mutate(s.id)}
              />
            </View>
          ))}
        </View>
      )}

      {/* Premium Banner */}
      {!profile?.is_premium && (
        <Pressable
          style={({ pressed: p }) => [
            styles.premiumBanner,
            { backgroundColor: isDark ? '#1E293B' : '#FFFBEB' },
            pressed(p),
          ]}
          onPress={() => router.push('/(modals)/premium' as never)}
          accessibilityRole="button"
          accessibilityLabel="Premiumにアップグレード"
        >
          <View style={styles.premiumIconCircle}>
            <Text style={styles.premiumIconText}>P</Text>
          </View>
          <View style={styles.premiumBannerContent}>
            <Text style={[typography.bodyBold, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              Premium
            </Text>
            <Text style={[typography.caption1, { color: c.textMuted }]}>
              もっと便利な機能を使う
            </Text>
          </View>
          <Text style={[{ color: c.textMuted, fontSize: 16 }]}>›</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  greetingName: { ...typography.title1 },
  greetingSub: { ...typography.body, marginTop: 1 },

  // Section
  sectionLabel: {
    ...commonStyles.sectionHeader,
    marginBottom: 0,
  },

  // Buffer
  bufferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bufferBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bufferBarFill: { height: 8, borderRadius: 4 },
  recoveryLink: { alignSelf: 'flex-end', marginTop: spacing.sm, paddingVertical: 4 },
  recoveryLinkText: { ...typography.caption1, color: palette.accent },

  // Premium
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  premiumIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumIconText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  premiumBannerContent: { flex: 1, gap: 2 },
});
