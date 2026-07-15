import React, { useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed,
} from '@/src/lib/theme';
import { useMealItemThumb } from '@/src/hooks/useMealItemImage';
import { FoodScoreChip } from '@/src/components/meal/FoodScoreChip';
import { calculateMealScore, type FoodScoreInput } from '@/src/services/nutrition/foodScoreCalculator';
import type { Database } from '@/src/types/database';

type Meal = Database['public']['Tables']['meals']['Row'];
type MealItem = Database['public']['Tables']['meal_items']['Row'];
type MealWithItems = Meal & { meal_items: MealItem[] };

type FAIcon = React.ComponentProps<typeof FontAwesome>['name'];
const MEAL_TYPE_ICONS: Record<string, FAIcon> = {
  breakfast: 'sun-o',
  lunch: 'sun-o',
  dinner: 'moon-o',
  snack: 'star-o',
};

function MealRowThumb({ name }: { name: string }) {
  const { data: url } = useMealItemThumb(name);

  if (!url) {
    return (
      <View style={styles.rowThumbPlaceholder}>
        <FontAwesome name="cutlery" size={10} color={palette.primaryDark} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={styles.rowThumb}
      accessibilityIgnoresInvertColors
    />
  );
}

interface MealSectionCardProps {
  mealType: MealType;
  meals: MealWithItems[];
  onAdd: () => void;
  isDark: boolean;
}

function MealSectionCardComponent({ mealType, meals, onAdd, isDark }: MealSectionCardProps) {
  const router = useRouter();
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';
  const dividerColor = isDark ? '#334155' : '#E2E8F0';

  const totalKcal = meals.reduce((sum, m) => sum + (m.total_energy_kcal ?? 0), 0);
  const icon = MEAL_TYPE_ICONS[mealType] ?? 'cutlery';

  // 全食事の平均スコアを計算
  const sectionScore = useMemo(() => {
    const allItems = meals.flatMap((m) => m.meal_items ?? []);
    if (allItems.length === 0) return null;
    const inputs: FoodScoreInput[] = allItems.map((item) => ({
      energy_kcal: item.energy_kcal,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbohydrate_g: item.carbohydrate_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      portion_grams: item.portion_grams,
    }));
    return calculateMealScore(inputs);
  }, [meals]);

  return (
    <View style={[styles.card, { backgroundColor: surface }, shadow.sm]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: palette.primaryMuted }]}>
            <FontAwesome name={icon} size={18} color={palette.primary} />
          </View>
          <Text style={[typography.title3, { color: textColor }]}>
            {MEAL_TYPE_LABELS[mealType]}
          </Text>
          {meals.length > 0 && (
            <View style={styles.kcalRow}>
              {sectionScore && (
                <FoodScoreChip grade={sectionScore.grade} compact size="sm" />
              )}
              <Text style={[typography.title3, { color: palette.primary }]}>
                {Math.round(totalKcal)} kcal
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={onAdd}
          style={({ pressed: p }) => [styles.addButton, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]}を追加`}
        >
          <Text style={styles.addButtonText}>+ 追加</Text>
        </Pressable>
      </View>

      {/* Items */}
      {meals.length === 0 ? (
        <Pressable
          onPress={onAdd}
          style={({ pressed: p }) => [
            styles.emptyRow,
            { borderColor: isDark ? '#334155' : '#E2E8F0' },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]}を記録する`}
        >
          <Text style={[typography.caption1, { color: palette.primary, fontWeight: '600' }]}>
            📷 写真で記録
          </Text>
          <Text style={[typography.caption1, { color: textMuted }]}>|</Text>
          <Text style={[typography.caption1, { color: palette.primary, fontWeight: '600' }]}>
            🔍 食品を検索
          </Text>
        </Pressable>
      ) : (
        meals.map((meal) => (
          <Pressable
            key={meal.id}
            style={({ pressed: p }) => [
              styles.mealRow,
              { borderTopColor: dividerColor },
              pressed(p),
            ]}
            onPress={() => router.push(`/(modals)/meal-detail?id=${meal.id}`)}
            accessibilityRole="button"
          >
            <MealRowThumb
              name={meal.meal_items?.[0]?.ai_detected_name ?? meal.meal_type}
            />
            <View style={styles.mealInfo}>
              <Text style={[typography.body, { color: textColor }]} numberOfLines={1}>
                {meal.meal_items?.map((i) => i.ai_detected_name).join(', ') || '食事'}
              </Text>
              <View style={styles.pfcRow}>
                <Text style={[styles.pfcText, { color: palette.protein }]}>
                  P{(meal.total_protein_g ?? 0).toFixed(0)}g
                </Text>
                <Text style={[styles.pfcText, { color: palette.fat }]}>
                  F{(meal.total_fat_g ?? 0).toFixed(0)}g
                </Text>
                <Text style={[styles.pfcText, { color: palette.carbs }]}>
                  C{(meal.total_carbohydrate_g ?? 0).toFixed(0)}g
                </Text>
              </View>
            </View>
            <Text style={[typography.bodyBold, { color: textColor }]}>
              {Math.round(meal.total_energy_kcal ?? 0)}
              <Text style={[typography.caption2, { color: textMuted }]}> kcal</Text>
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

export const MealSectionCard = React.memo(MealSectionCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: palette.white, ...typography.caption1 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  rowThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  rowThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealInfo: {
    flex: 1,
    gap: 3,
  },
  pfcRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pfcText: {
    ...typography.caption2,
    fontWeight: '600',
  },
});
