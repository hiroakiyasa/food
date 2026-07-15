import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RadarChart, type RadarDataPoint } from '@/src/components/chart/RadarChart';
import { palette, typography, spacing } from '@/src/lib/theme';
import type { MacroRadarPoint } from '@/src/types/nutrientBalance';

interface MacroRadarSectionProps {
  data: MacroRadarPoint[];
  isDark: boolean;
}

function MacroRadarSectionComponent({ data, isDark }: MacroRadarSectionProps) {
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';

  const radarData: RadarDataPoint[] = data.map((d) => ({
    label: d.label,
    value: d.value,
    maxValue: d.maxValue,
  }));

  const macroColors = [palette.protein, palette.fat, palette.carbs, palette.fiber];

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
      </View>

      <View style={styles.summaryGrid}>
        {data.map((d, i) => {
          const pct = d.maxValue > 0 ? Math.round((d.value / d.maxValue) * 100) : 0;
          return (
            <View key={d.label} style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: macroColors[i] }]} />
              <Text style={[styles.summaryLabel, { color: textMuted }]}>{d.label}</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>
                {d.value.toFixed(0)}g
              </Text>
              <Text style={[styles.summaryPct, { color: macroColors[i] }]}>
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const MacroRadarSection = React.memo(MacroRadarSectionComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  radarWrap: {
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 120,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    ...typography.caption2,
    width: 28,
  },
  summaryValue: {
    ...typography.caption1,
    fontWeight: '700',
  },
  summaryPct: {
    ...typography.caption2,
    fontWeight: '600',
  },
});
