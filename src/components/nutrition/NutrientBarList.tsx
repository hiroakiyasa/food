import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NutrientBar } from '@/src/components/chart/NutrientBar';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/src/lib/nutritionConstants';
import { typography, spacing } from '@/src/lib/theme';
import type { NutrientBalanceItem } from '@/src/types/nutrientBalance';
import type { NutrientCategory } from '@/src/lib/nutritionConstants';
import type { BalanceDisplayMode } from '@/src/types/nutrientBalance';

interface NutrientBarListProps {
  nutrients: NutrientBalanceItem[];
  displayMode: BalanceDisplayMode;
  isDark: boolean;
}

function NutrientBarListComponent({ nutrients, displayMode, isDark }: NutrientBarListProps) {
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';
  const headerBg = isDark ? '#1E293B' : '#F1F5F9';

  const grouped = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = nutrients.filter((n) => n.category === cat);
      return acc;
    },
    {} as Record<NutrientCategory, NutrientBalanceItem[]>,
  );

  return (
    <View>
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;

        return (
          <View key={cat} style={styles.section}>
            <View style={[styles.categoryHeader, { backgroundColor: headerBg }]}>
              <Text style={[styles.categoryLabel, { color: textMuted }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </View>

            {items.map((item) =>
              displayMode === 'graph' ? (
                <NutrientBar
                  key={item.key}
                  nameJa={item.nameJa}
                  currentValue={item.currentValue}
                  targetValue={item.targetValue}
                  ratio={item.ratio}
                  status={item.status}
                  color={item.color}
                  unit={item.unit}
                  isDark={isDark}
                  isEstimated={item.isEstimated}
                />
              ) : (
                <View key={item.key} style={styles.numericRow}>
                  <Text style={[styles.numericName, { color: textColor }]}>
                    {item.nameJa}
                  </Text>
                  <Text style={[styles.numericValue, { color: item.color }]}>
                    {item.currentValue < 10
                      ? item.currentValue.toFixed(1)
                      : Math.round(item.currentValue)}
                  </Text>
                  <Text style={[styles.numericUnit, { color: textMuted }]}>
                    {item.unit}
                  </Text>
                  <Text style={[styles.numericSlash, { color: textMuted }]}>/</Text>
                  <Text style={[styles.numericTarget, { color: textMuted }]}>
                    {item.targetValue < 10
                      ? item.targetValue.toFixed(1)
                      : Math.round(item.targetValue)}
                  </Text>
                  <Text style={[styles.numericPercent, { color: textColor }]}>
                    {Math.round(item.ratio * 100)}%
                  </Text>
                </View>
              ),
            )}
          </View>
        );
      })}
    </View>
  );
}

export const NutrientBarList = React.memo(NutrientBarListComponent);

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    ...typography.caption2,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  numericRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  numericName: {
    ...typography.caption1,
    width: 90,
  },
  numericValue: {
    ...typography.caption1,
    fontWeight: '700',
    width: 50,
    textAlign: 'right',
  },
  numericUnit: {
    fontSize: 9,
    width: 36,
  },
  numericSlash: {
    fontSize: 11,
  },
  numericTarget: {
    ...typography.caption2,
    width: 50,
    textAlign: 'right',
  },
  numericPercent: {
    ...typography.caption1,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
});
