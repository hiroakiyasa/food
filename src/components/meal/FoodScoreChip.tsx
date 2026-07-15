import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GRADE_COLORS, GRADE_BG_COLORS, type FoodScoreGrade } from '@/src/services/nutrition/foodScoreCalculator';
import { typography } from '@/src/lib/theme';

interface FoodScoreChipProps {
  grade: FoodScoreGrade;
  value?: number;
  /** compact=trueでグレード文字のみ表示 */
  compact?: boolean;
  size?: 'sm' | 'md';
}

export function FoodScoreChip({ grade, value, compact = false, size = 'md' }: FoodScoreChipProps) {
  const color = GRADE_COLORS[grade];
  const bgColor = GRADE_BG_COLORS[grade];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bgColor, borderColor: color },
        isSmall && styles.chipSm,
      ]}
    >
      <Text
        style={[
          styles.grade,
          { color },
          isSmall && styles.gradeSm,
        ]}
      >
        {grade}
      </Text>
      {!compact && value != null && (
        <Text style={[styles.value, { color }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    gap: 3,
  },
  chipSm: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  grade: {
    ...typography.caption2,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gradeSm: {
    fontSize: 10,
    fontWeight: '800',
  },
  value: {
    ...typography.caption2,
    fontWeight: '600',
  },
});
