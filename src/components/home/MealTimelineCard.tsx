import React, { useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { formatCalories } from '@/src/utils/formatters';
import {
  palette, typography, spacing, radius,
  commonStyles, pressed, shadow,
} from '@/src/lib/theme';
import { useMealItemImage } from '@/src/hooks/useMealItemImage';
import { FoodScoreChip } from '@/src/components/meal/FoodScoreChip';
import { calculateMealScore, type FoodScoreInput } from '@/src/services/nutrition/foodScoreCalculator';
import type { Database } from '@/src/types/database';

type Meal = Database['public']['Tables']['meals']['Row'];
type MealItem = Database['public']['Tables']['meal_items']['Row'];
type MealWithItems = Meal & { meal_items: MealItem[] };

type FAIcon = React.ComponentProps<typeof FontAwesome>['name'];
const MEAL_ICONS: Record<string, FAIcon> = {
  breakfast: 'sun-o',
  lunch: 'sun-o',
  dinner: 'moon-o',
  snack: 'star-o',
};

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
  snack: '🍎',
};

// Thumbnail component for individual meal items
function MealItemThumbnail({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const { data: unsplashUrl } = useMealItemImage(imageUrl ? null : name);
  const url = imageUrl ?? unsplashUrl;

  if (!url) {
    return (
      <View style={styles.thumbPlaceholder}>
        <FontAwesome name="cutlery" size={12} color={palette.primaryDark} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={styles.thumb}
      accessibilityIgnoresInvertColors
    />
  );
}

interface MealTypeRowProps {
  mealType: MealType;
  mealsForType: MealWithItems[];
  isDark: boolean;
  isLast: boolean;
}

function MealTypeRow({ mealType, mealsForType, isDark, isLast }: MealTypeRowProps) {
  const router = useRouter();
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const lineColor = isDark ? '#334155' : '#E2E8F0';
  const emoji = MEAL_EMOJIS[mealType];
  const hasData = mealsForType.length > 0;

  // 食事スコアを計算
  const mealScores = useMemo(() => {
    return mealsForType.map((meal) => {
      if (!meal.meal_items || meal.meal_items.length === 0) return null;
      const inputs: FoodScoreInput[] = meal.meal_items.map((item) => ({
        energy_kcal: item.energy_kcal,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbohydrate_g: item.carbohydrate_g,
        fiber_g: item.fiber_g,
        sodium_mg: item.sodium_mg,
        portion_grams: item.portion_grams,
      }));
      return calculateMealScore(inputs);
    });
  }, [mealsForType]);

  const handleAdd = () => router.push(`/(modals)/food-search?mealType=${mealType}` as never);

  return (
    <View style={styles.typeRow}>
      {/* Timeline column */}
      <View style={styles.timelineCol}>
        <View style={[styles.iconCircle, { backgroundColor: hasData ? palette.primaryMuted : (isDark ? '#1E293B' : '#F1F5F9') }]}>
          <Text style={styles.mealEmoji}>{emoji}</Text>
        </View>
        {!isLast && (
          <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.contentCol}>
        {hasData ? (
          /* Recorded meals */
          mealsForType.map((meal, mealIdx) => {
            const mealScore = mealScores[mealIdx];
            return (
            <Pressable
              key={meal.id}
              style={({ pressed: p }) => [
                styles.mealContent,
                { backgroundColor: surface },
                shadow.sm,
                pressed(p),
              ]}
              onPress={() => router.push(`/(modals)/meal-detail?id=${meal.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.mealHeader}>
                <Text style={[typography.caption1, { color: palette.primary, fontWeight: '600' }]}>
                  {MEAL_TYPE_LABELS[mealType]}
                </Text>
                <View style={styles.mealHeaderRight}>
                  {mealScore && (
                    <FoodScoreChip grade={mealScore.grade} compact size="sm" />
                  )}
                  <Text style={[typography.bodyBold, { color: textColor }]}>
                    {Math.round(meal.total_energy_kcal ?? 0)}
                    <Text style={[typography.caption2, { color: textMuted }]}> kcal</Text>
                  </Text>
                </View>
              </View>

              {meal.meal_items && meal.meal_items.length > 0 && (
                <View style={styles.thumbRow}>
                  {meal.meal_items.slice(0, 4).map((item) => (
                    <MealItemThumbnail
                      key={item.id}
                      name={item.ai_detected_name}
                      imageUrl={null}
                    />
                  ))}
                  {meal.meal_items.length > 4 && (
                    <View style={styles.thumbMore}>
                      <Text style={[typography.caption2, { color: textMuted }]}>
                        +{meal.meal_items.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={[typography.caption1, { color: textMuted }]} numberOfLines={1}>
                {meal.meal_items?.map((i) => i.ai_detected_name).join(', ') || ''}
              </Text>

              <View style={styles.pfcMini}>
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
            </Pressable>
            );
          })
        ) : (
          /* Placeholder for unrecorded meal */
          <Pressable
            onPress={handleAdd}
            style={({ pressed: p }) => [
              styles.placeholderRow,
              {
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]}を記録する`}
          >
            <Text style={[typography.caption1, { color: isDark ? '#475569' : '#CBD5E1' }]}>
              {MEAL_TYPE_LABELS[mealType]}
            </Text>
            <Text style={[typography.caption1, { color: palette.primary, fontWeight: '600' }]}>
              + 記録する
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface MealTimelineCardProps {
  meals: MealWithItems[];
  isDark: boolean;
}

function MealTimelineCardComponent({ meals, isDark }: MealTimelineCardProps) {
  // Group meals by type
  const mealsByType = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = meals.filter((m) => m.meal_type === type);
      return acc;
    },
    {} as Record<MealType, MealWithItems[]>,
  );

  return (
    <View style={styles.container}>
      {MEAL_TYPES.map((type, index) => (
        <MealTypeRow
          key={type}
          mealType={type}
          mealsForType={mealsByType[type]}
          isDark={isDark}
          isLast={index === MEAL_TYPES.length - 1}
        />
      ))}
    </View>
  );
}

export const MealTimelineCard = React.memo(MealTimelineCardComponent);

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineCol: {
    alignItems: 'center',
    width: 36,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmoji: {
    fontSize: 15,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    minHeight: 12,
  },
  contentCol: {
    flex: 1,
    paddingBottom: spacing.sm,
  },

  // Recorded meal card
  mealContent: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: 4,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pfcMini: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  pfcText: {
    ...typography.caption2,
    fontWeight: '600',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMore: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Placeholder row
  placeholderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: spacing.xs,
  },
});
