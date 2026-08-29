import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  palette, typography, spacing, radius, useThemeColors,
} from '@/src/lib/theme';
import type { SleepNutritionAnalysis } from '@/src/hooks/useSleepNutritionCorrelation';

interface SleepInsightCardProps {
  analysis: SleepNutritionAnalysis;
  isDark: boolean;
}

function getSleepQuality(hours: number): { label: string; color: string } {
  if (hours >= 7 && hours <= 9) return { label: '良好', color: palette.success };
  if (hours >= 6 && hours < 7) return { label: '普通', color: palette.warning };
  if (hours > 9) return { label: '多め', color: palette.accent };
  return { label: '不足', color: palette.error };
}

const INSIGHT_COLORS = {
  positive: palette.success,
  warning: palette.warning,
  info: palette.accent,
} as const;

const INSIGHT_ICONS = {
  positive: '✓',
  warning: '!',
  info: '→',
} as const;

export const SleepInsightCard = memo(function SleepInsightCard({
  analysis,
  isDark,
}: SleepInsightCardProps) {
  const c = useThemeColors(isDark);

  if (!analysis.hasHealthData) {
    return (
      <View style={[styles.noData, { backgroundColor: c.surfaceAlt }]}>
        <Text style={[styles.noDataIcon, { color: c.textMuted }]}>🌙</Text>
        <Text style={[typography.caption1, { color: c.textMuted, textAlign: 'center' }]}>
          HealthKitの睡眠データを連携すると{'\n'}栄養との相関が表示されます
        </Text>
      </View>
    );
  }

  const { avgSleepHours, avgSleepScore, insights, correlations } = analysis;
  const quality = avgSleepHours != null ? getSleepQuality(avgSleepHours) : null;

  const topInsights = insights.slice(0, 3);
  const significantCorrs = correlations
    .filter((r) => Math.abs(r.coefficient) >= 0.15)
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
    .slice(0, 4);

  return (
    <View style={styles.container}>
      {/* Sleep summary row */}
      {avgSleepHours != null && (
        <View style={[styles.summaryRow, { borderBottomColor: c.divider }]}>
          <View style={styles.metricBlock}>
            <Text style={[styles.bigValue, { color: c.text }]}>
              {avgSleepHours.toFixed(1)}
            </Text>
            <Text style={[typography.caption2, { color: c.textMuted }]}>時間 / 平均</Text>
          </View>

          {quality && (
            <View style={[styles.qualityBadge, { backgroundColor: quality.color + '22' }]}>
              <Text style={[typography.caption1, { color: quality.color, fontWeight: '700' }]}>
                {quality.label}
              </Text>
            </View>
          )}

          {avgSleepScore != null && (
            <View style={[styles.metricBlock, styles.metricRight]}>
              <Text style={[styles.bigValue, { color: c.text }]}>
                {Math.round(avgSleepScore)}
              </Text>
              <Text style={[typography.caption2, { color: c.textMuted }]}>スコア</Text>
            </View>
          )}
        </View>
      )}

      {/* Insights */}
      {topInsights.length > 0 && (
        <View style={styles.insightList}>
          {topInsights.map((insight, i) => {
            const color = INSIGHT_COLORS[insight.type];
            const icon = INSIGHT_ICONS[insight.type];
            return (
              <View key={i} style={[styles.insightRow, { borderLeftColor: color }]}>
                <Text style={[styles.insightIcon, { color }]}>{icon}</Text>
                <View style={styles.insightText}>
                  <Text style={[typography.caption1, { color: c.text, fontWeight: '600' }]}>
                    {insight.title}
                  </Text>
                  <Text style={[typography.caption2, { color: c.textSecondary }]}>
                    {insight.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Correlation bars */}
      {significantCorrs.length > 0 && (
        <View style={styles.corrSection}>
          <Text style={[typography.caption2, { color: c.textMuted, marginBottom: spacing.xs }]}>
            睡眠スコアとの相関
          </Text>
          {significantCorrs.map((corr) => {
            const isPos = corr.coefficient > 0;
            const barColor = isPos ? palette.success : palette.error;
            const barPct = Math.round(Math.abs(corr.coefficient) * 100);
            const barWidth = `${barPct}%` as `${number}%`;
            return (
              <View key={corr.label} style={styles.corrRow}>
                <Text style={[typography.caption2, { color: c.textSecondary, width: 88 }]}>
                  {corr.label}
                </Text>
                <View style={[styles.corrTrack, { backgroundColor: c.surfaceAlt }]}>
                  <View style={[styles.corrBar, { width: barWidth, backgroundColor: barColor }]} />
                </View>
                <Text style={[typography.caption2, { color: barColor, width: 38, textAlign: 'right' }]}>
                  {isPos ? '+' : ''}{(corr.coefficient * 100).toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Sample count footnote */}
      {correlations[0] && (
        <Text style={[typography.caption2, { color: c.textMuted, textAlign: 'right' }]}>
          過去 {correlations[0].sampleCount} 日のデータ
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  noData: {
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  noDataIcon: { fontSize: 28 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricBlock: { alignItems: 'center' },
  metricRight: { marginLeft: 'auto' },
  bigValue: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  qualityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  insightList: { gap: spacing.sm },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
  },
  insightIcon: { fontSize: 12, fontWeight: '700', marginTop: 1, width: 12 },
  insightText: { flex: 1, gap: 2 },
  corrSection: { gap: 6 },
  corrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  corrTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  corrBar: { height: 6, borderRadius: 3 },
});
