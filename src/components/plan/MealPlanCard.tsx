import { memo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';
import type { MealPlanDay, MealPlanMeal, WeeklyMealPlan } from '@/src/hooks/useWeeklyMealPlan';

interface MealPlanCardProps {
  plan: WeeklyMealPlan;
  isDark: boolean;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: 'おやつ',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#28A86B',
  dinner: '#6366F1',
  snack: '#F97316',
};

function MealRow({
  mealKey,
  meal,
  isDark,
}: {
  mealKey: string;
  meal: MealPlanMeal | null;
  isDark: boolean;
}) {
  const c = useThemeColors(isDark);
  const [expanded, setExpanded] = useState(false);

  if (!meal) return null;
  const color = MEAL_COLORS[mealKey] ?? palette.primary;

  return (
    <Pressable
      onPress={() => setExpanded((e) => !e)}
      style={({ pressed: p }) => [
        styles.mealRow,
        { borderLeftColor: color },
        pressed(p),
      ]}
    >
      <View style={styles.mealHeader}>
        <View style={[styles.mealLabelBadge, { backgroundColor: color + '22' }]}>
          <Text style={[typography.caption2, { color, fontWeight: '700' }]}>
            {MEAL_LABELS[mealKey] ?? mealKey}
          </Text>
        </View>
        <Text style={[typography.caption1, { color: c.text, flex: 1, marginLeft: spacing.sm }]} numberOfLines={expanded ? undefined : 1}>
          {meal.name}
        </Text>
        <Text style={[typography.caption2, { color: c.textMuted }]}>{meal.kcal}kcal</Text>
      </View>

      {expanded && (
        <View style={styles.mealDetail}>
          <Text style={[typography.caption2, { color: c.textSecondary, marginBottom: 4 }]}>
            {meal.description}
          </Text>
          {/* PFC mini bar */}
          <View style={styles.pfcRow}>
            {[
              { label: 'P', value: meal.protein_g, color: palette.protein },
              { label: 'F', value: meal.fat_g, color: palette.fat },
              { label: 'C', value: meal.carbs_g, color: palette.carbs },
            ].map((n) => (
              <View key={n.label} style={styles.pfcItem}>
                <View style={[styles.pfcDot, { backgroundColor: n.color }]} />
                <Text style={[typography.caption2, { color: c.textMuted }]}>
                  {n.label} {n.value}g
                </Text>
              </View>
            ))}
          </View>
          {/* Ingredients */}
          {meal.items.length > 0 && (
            <Text style={[typography.caption2, { color: c.textMuted, marginTop: 4 }]}>
              {meal.items.join('・')}
            </Text>
          )}
          {/* Recipe */}
          {meal.recipe && (
            <Text style={[typography.caption2, { color: c.textSecondary, marginTop: 4, fontStyle: 'italic' }]}>
              {meal.recipe}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

function DayCard({ day, isSelected, onPress, isDark }: {
  day: MealPlanDay;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const c = useThemeColors(isDark);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.dayChip,
        {
          backgroundColor: isSelected ? palette.primary : c.surfaceAlt,
          borderColor: isSelected ? palette.primary : c.border,
        },
        pressed(p),
      ]}
    >
      <Text style={[typography.caption2, { color: isSelected ? palette.white : c.textMuted }]}>
        {day.day_name}
      </Text>
      <Text style={[typography.caption2, { color: isSelected ? palette.white + 'CC' : c.textMuted }]}>
        {day.total_kcal}
      </Text>
    </Pressable>
  );
}

export const MealPlanCard = memo(function MealPlanCard({ plan, isDark }: MealPlanCardProps) {
  const c = useThemeColors(isDark);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const selectedDay = plan.days[selectedDayIdx];

  return (
    <View style={styles.container}>
      {/* Week theme */}
      <View style={[styles.themeRow, { backgroundColor: palette.primaryMuted }]}>
        <Text style={[typography.caption1, { color: palette.primaryDark, fontWeight: '600' }]}>
          {plan.week_summary.theme}
        </Text>
        {plan.week_summary.highlights.slice(0, 2).map((h, i) => (
          <Text key={i} style={[typography.caption2, { color: palette.primaryDark + 'CC' }]}>
            ✓ {h}
          </Text>
        ))}
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {plan.days.map((day, i) => (
          <DayCard
            key={day.date}
            day={day}
            isSelected={selectedDayIdx === i}
            onPress={() => setSelectedDayIdx(i)}
            isDark={isDark}
          />
        ))}
      </ScrollView>

      {/* Selected day meals */}
      {selectedDay && (
        <View style={styles.mealsSection}>
          <Text style={[typography.caption2, { color: c.textMuted, marginBottom: spacing.sm }]}>
            {selectedDay.date} ({selectedDay.day_name}) ·
            総計 {selectedDay.total_kcal}kcal ·
            P{selectedDay.total_protein_g}g
          </Text>

          {(Object.entries(selectedDay.meals) as Array<[string, MealPlanMeal | null]>).map(
            ([key, meal]) => meal && (
              <MealRow key={key} mealKey={key} meal={meal} isDark={isDark} />
            )
          )}
        </View>
      )}

      {/* Week avg summary */}
      <View style={[styles.summaryRow, { backgroundColor: c.surfaceAlt }]}>
        {[
          { label: '平均kcal', value: plan.week_summary.avg_kcal, unit: '' },
          { label: 'P', value: plan.week_summary.avg_protein_g, unit: 'g' },
          { label: 'C', value: plan.week_summary.avg_carbs_g, unit: 'g' },
          { label: 'F', value: plan.week_summary.avg_fat_g, unit: 'g' },
        ].map((item) => (
          <View key={item.label} style={styles.summaryItem}>
            <Text style={[typography.caption2, { color: c.textMuted }]}>{item.label}</Text>
            <Text style={[typography.caption1, { color: c.text, fontWeight: '600' }]}>
              {item.value}{item.unit}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  themeRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 4,
  },
  dayScroll: { marginHorizontal: -spacing.sm },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginHorizontal: 4,
    minWidth: 52,
  },
  mealsSection: { gap: spacing.sm },
  mealRow: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    gap: 4,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealLabelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  mealDetail: {
    marginTop: 4,
    paddingLeft: spacing.sm,
  },
  pfcRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pfcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pfcDot: { width: 6, height: 6, borderRadius: 3 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  summaryItem: { alignItems: 'center', gap: 2 },
});
