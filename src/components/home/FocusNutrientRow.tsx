import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { MergedFocusNutrient } from '@/src/hooks/useActiveConditions';
import type { FocusNutrientValue } from '@/src/hooks/useFocusNutrientValues';
import {
  palette, typography, spacing, radius, pressed,
} from '@/src/lib/theme';

interface FocusNutrientRowProps {
  nutrient: MergedFocusNutrient;
  valueData?: FocusNutrientValue;
  isDark: boolean;
  onPress: () => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#6B7280',
};

function FocusNutrientRowComponent({ nutrient, valueData, isDark, onPress }: FocusNutrientRowProps) {
  const isIncrease = nutrient.action === 'increase';
  const actionColor = isIncrease ? palette.success : palette.warning;
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';
  const barBg = isDark ? '#334155' : '#E9E5D8';
  const priorityColor = PRIORITY_COLOR[nutrient.priority] ?? PRIORITY_COLOR.Low;

  // Short name (first word before space/paren)
  const shortName = nutrient.nutrientName.split(/[\s(（]/)[0];

  // Bar fill ratio — capped at 1.0 for display
  const ratio = valueData ? Math.min(valueData.ratio, 1) : 0;
  const pct = `${Math.round(ratio * 100)}%` as `${number}%`;

  // Format values compactly
  const formatVal = (v: number, unit: string) => {
    if (unit === 'kcal') return `${Math.round(v)}`;
    if (v < 10) return v.toFixed(1);
    return `${Math.round(v)}`;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [styles.row, pressed(p)]}
      accessibilityRole="button"
      accessibilityLabel={`${nutrient.nutrientName}の詳細を見る`}
    >
      {/* Action arrow + name */}
      <View style={styles.nameRow}>
        <Text style={[styles.arrow, { color: actionColor }]}>
          {isIncrease ? '↑' : '↓'}
        </Text>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {shortName}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22' }]}>
          <Text style={[styles.priorityText, { color: priorityColor }]}>
            {nutrient.priority}
          </Text>
        </View>
      </View>

      {/* Bar + values */}
      {valueData ? (
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: barBg }]}>
            <View
              style={[
                styles.barFill,
                { width: pct, backgroundColor: actionColor },
              ]}
            />
          </View>
          <Text style={[styles.valueText, { color: textColor }]}>
            {formatVal(valueData.currentValue, valueData.unit)}
            <Text style={{ color: textMuted }}>
              /{formatVal(valueData.targetValue, valueData.unit)}{valueData.unit}
            </Text>
          </Text>
        </View>
      ) : (
        <Text style={[styles.unknownText, { color: textMuted }]}>
          推定摂取量不明
        </Text>
      )}

      {/* Reason (1 line) */}
      <Text style={[styles.reason, { color: textMuted }]} numberOfLines={1}>
        {nutrient.reason}
      </Text>
    </Pressable>
  );
}

export const FocusNutrientRow = React.memo(FocusNutrientRowComponent);

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrow: {
    ...typography.bodyBold,
    width: 14,
  },
  name: {
    ...typography.bodyBold,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  valueText: {
    ...typography.caption2,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'right',
  },
  unknownText: {
    ...typography.caption1,
    fontStyle: 'italic',
    marginTop: 2,
  },
  reason: {
    ...typography.caption2,
    marginTop: 1,
  },
});
