import { memo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  palette, typography, spacing, radius, useThemeColors,
} from '@/src/lib/theme';
import {
  CARBON_GRADE_COLORS, CARBON_GRADE_LABELS,
  type CarbonGrade,
} from '@/src/services/sustainability/carbonCalculator';
import type { CarbonFootprintAnalysis } from '@/src/hooks/useCarbonFootprint';

interface CarbonFootprintCardProps {
  analysis: CarbonFootprintAnalysis;
  isDark: boolean;
}

const GRADE_ORDER: CarbonGrade[] = ['A', 'B', 'C', 'D', 'E'];

const TREE_EQUIVALENT_KG = 21; // 木1本が年間吸収するCO₂ ≈ 21 kg

function GradeBar({ grade, isDark }: { grade: CarbonGrade | null; isDark: boolean }) {
  const c = useThemeColors(isDark);
  return (
    <View style={styles.gradeBar}>
      {GRADE_ORDER.map((g) => {
        const isActive = g === grade;
        const color = CARBON_GRADE_COLORS[g];
        return (
          <View key={g} style={[styles.gradeSegment, { backgroundColor: isActive ? color : c.surfaceAlt }]}>
            <Text style={[styles.gradeSegmentText, { color: isActive ? palette.white : c.textMuted }]}>
              {g}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const CarbonFootprintCard = memo(function CarbonFootprintCard({
  analysis,
  isDark,
}: CarbonFootprintCardProps) {
  const c = useThemeColors(isDark);

  if (analysis.dailyPoints.length === 0) {
    return (
      <View style={[styles.noData, { backgroundColor: c.surfaceAlt }]}>
        <Text style={styles.noDataIcon}>🌱</Text>
        <Text style={[typography.caption1, { color: c.textMuted, textAlign: 'center' }]}>
          食事を記録すると{'\n'}環境負荷スコアが表示されます
        </Text>
      </View>
    );
  }

  const { avgKgPerDay, avgGrade, vsJapanAverage, topSource } = analysis;
  const gradeColor = avgGrade ? CARBON_GRADE_COLORS[avgGrade] : palette.primary;
  const gradeLabel = avgGrade ? CARBON_GRADE_LABELS[avgGrade] : '—';

  // 木何本分か
  const treeEquivalent = avgKgPerDay
    ? Math.round((avgKgPerDay * 365) / TREE_EQUIVALENT_KG * 10) / 10
    : null;

  return (
    <View style={styles.container}>
      {/* Summary row */}
      <View style={[styles.summaryRow, { borderBottomColor: c.divider }]}>
        <View style={styles.metricBlock}>
          <Text style={[styles.bigValue, { color: gradeColor }]}>
            {avgKgPerDay?.toFixed(1) ?? '—'}
          </Text>
          <Text style={[typography.caption2, { color: c.textMuted }]}>kg CO₂e / 日</Text>
        </View>

        <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '22' }]}>
          <Text style={[typography.caption1, { color: gradeColor, fontWeight: '700' }]}>
            {gradeLabel}
          </Text>
        </View>

        {vsJapanAverage != null && (
          <View style={[styles.metricBlock, styles.metricRight]}>
            <Text style={[
              styles.compValue,
              { color: vsJapanAverage <= 0 ? palette.success : palette.error },
            ]}>
              {vsJapanAverage > 0 ? '+' : ''}{vsJapanAverage}%
            </Text>
            <Text style={[typography.caption2, { color: c.textMuted }]}>日本平均比</Text>
          </View>
        )}
      </View>

      {/* Grade scale */}
      <GradeBar grade={avgGrade ?? null} isDark={isDark} />

      {/* Key insights */}
      <View style={styles.insights}>
        {topSource && (
          <View style={[styles.insightRow, { borderLeftColor: gradeColor }]}>
            <Text style={[typography.caption1, { color: c.text }]}>
              主な排出源: <Text style={{ fontWeight: '700' }}>{topSource}</Text>
            </Text>
          </View>
        )}
        {treeEquivalent != null && (
          <View style={[styles.insightRow, { borderLeftColor: palette.success }]}>
            <Text style={[typography.caption1, { color: c.text }]}>
              年間換算: 木 <Text style={{ fontWeight: '700' }}>{treeEquivalent}本</Text> 分の吸収量に相当
            </Text>
          </View>
        )}
        {avgGrade && (avgGrade === 'A' || avgGrade === 'B') && (
          <View style={[styles.insightRow, { borderLeftColor: palette.success }]}>
            <Text style={[typography.caption1, { color: c.text }]}>
              素晴らしい！植物性食品中心の環境に優しい食事ができています
            </Text>
          </View>
        )}
        {avgGrade && (avgGrade === 'D' || avgGrade === 'E') && (
          <View style={[styles.insightRow, { borderLeftColor: palette.error }]}>
            <Text style={[typography.caption1, { color: c.text }]}>
              週2〜3回、肉料理を魚・豆腐・大豆製品に置き換えると排出量を減らせます
            </Text>
          </View>
        )}
      </View>

      {/* Daily trend mini bar chart */}
      {analysis.dailyPoints.length > 1 && (
        <View style={styles.trendSection}>
          <Text style={[typography.caption2, { color: c.textMuted, marginBottom: 6 }]}>
            日別CO₂推移
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {analysis.dailyPoints.slice(-14).map((point) => {
                const maxKg = Math.max(...analysis.dailyPoints.map((d) => d.estimated_kg), 1);
                const barHeightPct = Math.max(0.05, point.estimated_kg / maxKg);
                const barColor = CARBON_GRADE_COLORS[point.grade];
                return (
                  <View key={point.date} style={styles.barItem}>
                    <View style={[styles.barTrack, { backgroundColor: c.surfaceAlt }]}>
                      <View style={[
                        styles.barFill,
                        {
                          height: `${Math.round(barHeightPct * 100)}%` as `${number}%`,
                          backgroundColor: barColor,
                        },
                      ]} />
                    </View>
                    <Text style={[styles.barLabel, { color: c.textMuted }]}>
                      {point.date.slice(5)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Footnote */}
      <Text style={[typography.caption2, { color: c.textMuted, fontStyle: 'italic' }]}>
        ※ 栄養データから推定した概算値です（Poore &amp; Nemecek 2018参照）
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.md },
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
  compValue: { fontSize: 18, fontWeight: '600' },
  gradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  gradeBar: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    overflow: 'hidden',
    height: 28,
  },
  gradeSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeSegmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  insights: { gap: spacing.sm },
  insightRow: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    paddingVertical: 2,
  },
  trendSection: { gap: 4 },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 60,
  },
  barItem: { alignItems: 'center', gap: 2 },
  barTrack: {
    width: 20,
    height: 48,
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 3 },
  barLabel: { fontSize: 8 },
});
