import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { palette, typography, spacing, radius } from '@/src/lib/theme';
import type { Database } from '@/src/types/database';

type DailySummary = Database['public']['Tables']['daily_summaries']['Row'];

interface NutrientTrendMiniProps {
  summaries: DailySummary[];
  isDark: boolean;
}

interface SparkLineData {
  label: string;
  color: string;
  values: number[];
  latestValue: number;
  trend: 'up' | 'down' | 'flat';
}

function buildSparkLine(
  label: string,
  color: string,
  values: number[],
): SparkLineData {
  const latest = values.length > 0 ? values[values.length - 1] : 0;
  const prev = values.length > 1 ? values[values.length - 2] : latest;
  const diff = latest - prev;
  const trend: 'up' | 'down' | 'flat' = diff > 1 ? 'up' : diff < -1 ? 'down' : 'flat';
  return { label, color, values, latestValue: latest, trend };
}

function MiniSparkChart({ values, color, width = 60, height = 24 }: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NutrientTrendMiniComponent({ summaries, isDark }: NutrientTrendMiniProps) {
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';
  const surfaceAlt = isDark ? '#334155' : '#F1F5F9';

  const sparkData = useMemo((): SparkLineData[] => {
    const proteinVals = summaries.map((s) => s.total_protein_g ?? 0);
    const fatVals = summaries.map((s) => s.total_fat_g ?? 0);
    const carbVals = summaries.map((s) => s.total_carbohydrate_g ?? 0);
    const fiberVals = summaries.map((s) => s.total_fiber_g ?? 0);

    return [
      buildSparkLine('たんぱく質', palette.protein, proteinVals),
      buildSparkLine('脂質', palette.fat, fatVals),
      buildSparkLine('炭水化物', palette.carbs, carbVals),
      buildSparkLine('食物繊維', palette.fiber, fiberVals),
    ];
  }, [summaries]);

  if (summaries.length < 2) return null;

  const TREND_ARROWS = { up: '↑', down: '↓', flat: '→' };
  const TREND_COLORS = { up: palette.success, down: palette.error, flat: textMuted };

  return (
    <View style={styles.grid}>
      {sparkData.map((item) => (
        <View key={item.label} style={[styles.cell, { backgroundColor: surfaceAlt }]}>
          <View style={styles.cellHeader}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={[styles.cellLabel, { color: textMuted }]}>{item.label}</Text>
          </View>
          <View style={styles.cellBody}>
            <Text style={[styles.cellValue, { color: textColor }]}>
              {item.latestValue.toFixed(0)}g
            </Text>
            <Text style={[styles.trendArrow, { color: TREND_COLORS[item.trend] }]}>
              {TREND_ARROWS[item.trend]}
            </Text>
          </View>
          <MiniSparkChart values={item.values} color={item.color} />
        </View>
      ))}
    </View>
  );
}

export const NutrientTrendMini = React.memo(NutrientTrendMiniComponent);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cellLabel: {
    ...typography.caption2,
  },
  cellBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cellValue: {
    ...typography.numberSmall,
    fontSize: 18,
  },
  trendArrow: {
    fontSize: 14,
    fontWeight: '700',
  },
});
