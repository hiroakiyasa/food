import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
import { RadarChart, type RadarDataPoint } from '@/src/components/chart/RadarChart';
import { palette, typography, spacing, radius, shadow } from '@/src/lib/theme';
import type { Database } from '@/src/types/database';

type DailySummary = Database['public']['Tables']['daily_summaries']['Row'];

interface WeeklyNutrientRadarProps {
  summaries: DailySummary[];
  proteinTarget: number;
  fatTarget: number;
  carbsTarget: number;
  fiberTarget: number;
  isDark: boolean;
}

function WeeklyNutrientRadarComponent({
  summaries,
  proteinTarget,
  fatTarget,
  carbsTarget,
  fiberTarget,
  isDark,
}: WeeklyNutrientRadarProps) {
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';

  const averages = useMemo(() => {
    if (summaries.length === 0) {
      return { protein: 0, fat: 0, carbs: 0, fiber: 0 };
    }
    const count = summaries.length;
    return {
      protein: summaries.reduce((s, d) => s + (d.total_protein_g ?? 0), 0) / count,
      fat: summaries.reduce((s, d) => s + (d.total_fat_g ?? 0), 0) / count,
      carbs: summaries.reduce((s, d) => s + (d.total_carbohydrate_g ?? 0), 0) / count,
      fiber: summaries.reduce((s, d) => s + (d.total_fiber_g ?? 0), 0) / count,
    };
  }, [summaries]);

  const radarData: RadarDataPoint[] = [
    { label: 'P', value: averages.protein, maxValue: proteinTarget },
    { label: 'F', value: averages.fat, maxValue: fatTarget },
    { label: 'C', value: averages.carbs, maxValue: carbsTarget },
    { label: '繊維', value: averages.fiber, maxValue: fiberTarget },
  ];

  if (summaries.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.radarWrap}>
        <RadarChart
          data={radarData}
          size={180}
          isDark={isDark}
          animated
          showLabels
        />
        {/* Ghost "ideal" ring at 100% is the outermost grid line */}
      </View>

      <View style={styles.avgRow}>
        {[
          { label: 'P', value: averages.protein, color: palette.protein },
          { label: 'F', value: averages.fat, color: palette.fat },
          { label: 'C', value: averages.carbs, color: palette.carbs },
          { label: '繊維', value: averages.fiber, color: palette.fiber },
        ].map((item) => (
          <View key={item.label} style={styles.avgItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={[styles.avgLabel, { color: textMuted }]}>{item.label}</Text>
            <Text style={[styles.avgValue, { color: item.color }]}>
              {item.value.toFixed(0)}g
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.note, { color: textMuted }]}>
        期間内の1日平均値
      </Text>
    </View>
  );
}

export const WeeklyNutrientRadar = React.memo(WeeklyNutrientRadarComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  radarWrap: {
    alignItems: 'center',
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  avgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  avgLabel: {
    ...typography.caption2,
  },
  avgValue: {
    ...typography.caption1,
    fontWeight: '700',
  },
  note: {
    ...typography.caption2,
  },
});
