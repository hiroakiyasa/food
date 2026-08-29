import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { useMealItemThumb } from '@/src/hooks/useMealItemImage';
import { usePrivateImageUrl } from '@/src/hooks/usePrivateImageUrl';
import { palette, pressed, radius, shadow, spacing, typography } from '@/src/lib/theme';
import type { Database } from '@/src/types/database';

type Meal = Database['public']['Tables']['meals']['Row'];
type MealItem = Database['public']['Tables']['meal_items']['Row'];
type MealWithItems = Meal & { meal_items: MealItem[] };
type FAIcon = React.ComponentProps<typeof FontAwesome>['name'];

const MEAL_META: Record<MealType, { icon: FAIcon; color: string; soft: string }> = {
  breakfast: { icon: 'sun-o', color: '#E9AE18', soft: '#FFF4B8' },
  lunch: { icon: 'sun-o', color: palette.apricot, soft: '#FFE1D2' },
  dinner: { icon: 'moon-o', color: '#5F76D7', soft: '#E3E8FF' },
  snack: { icon: 'coffee', color: palette.berry, soft: '#FCE2EC' },
};

function MealPhoto({ meal }: { meal: MealWithItems }) {
  const firstName = meal.meal_items?.[0]?.ai_detected_name ?? meal.meal_type;
  const { data: thumbnail } = useMealItemThumb(firstName);
  const { data: privateImageUrl } = usePrivateImageUrl(meal.image_url);
  const uri = privateImageUrl ?? thumbnail;

  if (!uri) {
    return (
      <View style={styles.photoPlaceholder}>
        <FontAwesome name="cutlery" size={24} color={palette.primaryDark} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.photo}
      resizeMode="cover"
      accessibilityLabel={`${firstName}の食事写真`}
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
  const meta = MEAL_META[mealType];
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const text = isDark ? '#F1F5F9' : palette.ink;
  const muted = isDark ? '#8D9993' : '#66766F';
  const totalKcal = meals.reduce((sum, meal) => sum + (meal.total_energy_kcal ?? 0), 0);

  return (
    <View style={styles.section}>
      <View style={styles.timelineColumn}>
        <View style={[styles.iconCircle, { backgroundColor: meta.soft }]}>
          <FontAwesome name={meta.icon} size={24} color={meta.color} />
        </View>
        <Text style={[styles.mealLabel, { color: text }]}>{MEAL_TYPE_LABELS[mealType]}</Text>
        {mealType !== 'dinner' && <View style={styles.timeline} />}
      </View>

      <View style={styles.cardsColumn}>
        {meals.length === 0 ? (
          <Pressable
            onPress={onAdd}
            style={({ pressed: isPressed }) => [
              styles.emptyCard,
              { backgroundColor: surface, borderColor: isDark ? '#475569' : palette.accent },
              pressed(isPressed),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]}を記録する`}
          >
            <View style={[styles.emptyIllustration, { backgroundColor: meta.soft }]}>
              <FontAwesome name={meta.icon} size={26} color={meta.color} />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: text }]}>まだ記録がありません</Text>
              <Text style={[styles.emptyHint, { color: muted }]}>タップして追加しましょう</Text>
            </View>
            <View style={styles.arrowCircle}>
              <FontAwesome name="chevron-right" size={14} color="#278DC8" />
            </View>
          </Pressable>
        ) : (
          meals.map((meal) => (
            <Pressable
              key={meal.id}
              onPress={() => router.push(`/(modals)/meal-detail?id=${meal.id}`)}
              style={({ pressed: isPressed }) => [
                styles.mealCard,
                { backgroundColor: surface },
                pressed(isPressed),
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]} ${Math.round(meal.total_energy_kcal ?? 0)}キロカロリー、詳細を見る`}
            >
              <MealPhoto meal={meal} />
              <View style={styles.mealContent}>
                <Text style={[styles.mealNames, { color: text }]} numberOfLines={2}>
                  {meal.meal_items?.map((item) => item.ai_detected_name).filter(Boolean).join('、') || '食事'}
                </Text>
                <View style={styles.kcalRow}>
                  <Text style={[styles.kcalNumber, { color: palette.primaryDark }]}>
                    {Math.round(meal.total_energy_kcal ?? 0)}
                  </Text>
                  <Text style={[styles.kcalUnit, { color: text }]}>kcal</Text>
                </View>
              </View>
              <View style={styles.completeCircle}>
                <FontAwesome name="check" size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          ))
        )}

        {meals.length > 0 && (
          <Pressable
            onPress={onAdd}
            style={({ pressed: isPressed }) => [styles.addAnother, pressed(isPressed)]}
            accessibilityRole="button"
            accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]}を追加`}
          >
            <FontAwesome name="plus-circle" size={16} color={palette.primary} />
            <Text style={styles.addAnotherText}>もう1件追加</Text>
            <Text style={[styles.totalText, { color: muted }]}>合計 {Math.round(totalKcal)} kcal</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const MealSectionCard = React.memo(MealSectionCardComponent);

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.sm,
  },
  timelineColumn: {
    width: 68,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLabel: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '700',
  },
  timeline: {
    flex: 1,
    minHeight: 18,
    marginTop: 6,
    borderLeftWidth: 3,
    borderStyle: 'dotted',
    borderColor: '#DDD7C9',
  },
  cardsColumn: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  mealCard: {
    minHeight: 118,
    borderRadius: radius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.md,
  },
  photo: {
    width: 112,
    height: 94,
    borderRadius: radius.md,
  },
  photoPlaceholder: {
    width: 112,
    height: 94,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealContent: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  mealNames: {
    ...typography.caption1,
    lineHeight: 18,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  kcalNumber: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kcalUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  completeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#63C956',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIllustration: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: { flex: 1, gap: 3 },
  emptyTitle: { ...typography.bodyBold },
  emptyHint: { ...typography.caption1 },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAnother: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  addAnotherText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  totalText: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '500',
  },
});
