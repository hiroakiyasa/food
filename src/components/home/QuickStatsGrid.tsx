import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { palette, typography, spacing, radius, shadow } from '@/src/lib/theme';

interface QuickStatsGridProps {
  remainingCalories: number;
  steps: number | null;
  mealsCount: number;
  isDark: boolean;
}

function QuickStatsGridComponent({
  remainingCalories,
  steps,
  mealsCount,
  isDark,
}: QuickStatsGridProps) {
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';
  const isOver = remainingCalories < 0;

  return (
    <View style={styles.grid}>
      {/* Remaining calories */}
      <View style={[styles.card, { backgroundColor: surface }, shadow.sm]}>
        <FontAwesome name="fire" size={18} color={isOver ? palette.error : palette.primary} />
        <Text style={[styles.value, { color: isOver ? palette.error : textColor }]}>
          {isOver ? '+' : ''}{Math.abs(Math.round(remainingCalories)).toLocaleString()}
        </Text>
        <Text style={[styles.label, { color: textMuted }]}>
          {isOver ? '超過 kcal' : '残り kcal'}
        </Text>
      </View>

      {/* Meals count */}
      <View style={[styles.card, { backgroundColor: surface }, shadow.sm]}>
        <FontAwesome name="cutlery" size={18} color={palette.primary} />
        <Text style={[styles.value, { color: textColor }]}>
          {mealsCount}
        </Text>
        <Text style={[styles.label, { color: textMuted }]}>食事数</Text>
      </View>

      {/* Steps */}
      <View style={[styles.card, { backgroundColor: surface }, shadow.sm]}>
        <FontAwesome name="street-view" size={18} color={palette.accent} />
        <Text style={[styles.value, { color: textColor }]}>
          {steps != null ? steps.toLocaleString() : '未連携'}
        </Text>
        <Text style={[styles.label, { color: textMuted }]}>歩数</Text>
      </View>
    </View>
  );
}

export const QuickStatsGrid = React.memo(QuickStatsGridComponent);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    ...typography.numberSmall,
    fontSize: 17,
  },
  label: {
    ...typography.caption2,
    textAlign: 'center',
  },
});
