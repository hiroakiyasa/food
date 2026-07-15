import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatCalories } from '@/src/utils/formatters';
import { MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { palette, typography, spacing, radius, shadow, pressed } from '@/src/lib/theme';
import { useMealItemImage } from '@/src/hooks/useMealItemImage';
import type { Database } from '@/src/types/database';

type Meal = Database['public']['Tables']['meals']['Row'];

const TRAFFIC_COLORS: Record<string, string> = {
  green: palette.green,
  amber: palette.amber,
  red: palette.red,
};

interface MealCardProps {
  meal: Meal & { meal_items?: { ai_detected_name: string }[] };
  onPress?: () => void;
  isDark?: boolean;
}

export function MealCard({ meal, onPress, isDark = false }: MealCardProps) {
  const items = meal.meal_items?.map((i) => i.ai_detected_name).join(', ') ?? '';
  const trafficColor = TRAFFIC_COLORS[meal.traffic_light_overall ?? ''] ?? null;
  const surfaceBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const mutedColor = isDark ? '#8D9993' : '#66766F';

  // Fallback: if no meal image, fetch from Unsplash using first item name
  const firstItemName = meal.meal_items?.[0]?.ai_detected_name ?? null;
  const { data: unsplashUrl } = useMealItemImage(meal.image_url ? null : firstItemName);
  const displayImageUrl = meal.image_url ?? unsplashUrl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [styles.card, { backgroundColor: surfaceBg }, pressed(p)]}
      accessibilityRole="button"
      accessibilityLabel={`${MEAL_TYPE_LABELS[meal.meal_type as MealType] ?? meal.meal_type}, ${formatCalories(meal.total_energy_kcal ?? 0)}`}
    >
      {displayImageUrl ? (
        <Image source={{ uri: displayImageUrl }} style={styles.image} accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.imagePlaceholder}>
          <FontAwesome name="cutlery" size={20} color={palette.primaryDark} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.typeRow}>
          {trafficColor && <View style={[styles.trafficDot, { backgroundColor: trafficColor }]} />}
          <Text style={[typography.caption1, { color: mutedColor }]}>
            {MEAL_TYPE_LABELS[meal.meal_type as MealType] ?? meal.meal_type}
          </Text>
        </View>
        {items ? (
          <Text style={[typography.bodyBold, { color: textColor }]} numberOfLines={1}>
            {items}
          </Text>
        ) : null}
        <View style={styles.nutrients}>
          <Text style={[styles.calories, { color: palette.primary }]}>
            {formatCalories(meal.total_energy_kcal ?? 0)}
          </Text>
          <Text style={[typography.caption2, { color: mutedColor }]}>
            P{(meal.total_protein_g ?? 0).toFixed(0)}g F{(meal.total_fat_g ?? 0).toFixed(0)}g C{(meal.total_carbohydrate_g ?? 0).toFixed(0)}g
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  image: { width: 80, height: 80 },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#DDF3E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: spacing.md, gap: 3 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trafficDot: { width: 7, height: 7, borderRadius: 3.5 },
  nutrients: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  calories: { ...typography.caption1, fontWeight: '700' },
});
