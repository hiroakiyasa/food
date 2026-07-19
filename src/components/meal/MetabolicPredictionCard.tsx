import { View, Text, StyleSheet } from 'react-native';
import { palette, typography, spacing, radius, shadow, useThemeColors } from '@/src/lib/theme';
import type { MetabolicPrediction, SpikeRisk } from '@/src/hooks/useMetabolicPrediction';

const RISK_CONFIG: Record<SpikeRisk, { label: string; color: string }> = {
  low: { label: '上がりにくい', color: palette.success },
  moderate: { label: 'やや上がりやすい', color: palette.warning },
  high: { label: '上がりやすい', color: palette.error },
};

interface MetabolicPredictionCardProps {
  prediction: MetabolicPrediction;
  isDark?: boolean;
}

export function MetabolicPredictionCard({ prediction, isDark = false }: MetabolicPredictionCardProps) {
  const c = useThemeColors(isDark);
  const config = RISK_CONFIG[prediction.spikeRisk];

  return (
    <View
      style={[styles.card, { backgroundColor: c.surface }, shadow.md]}
      accessibilityRole="text"
      accessibilityLabel={`血糖値の上がりやすさの目安: ${config.label}`}
    >
      <View style={styles.header}>
        <Text style={[typography.title3, { color: c.text }]}>
          血糖値の上がりやすさ（目安）
        </Text>
        <View style={[styles.riskBadge, { backgroundColor: config.color + '15' }]}>
          <View style={[styles.riskDot, { backgroundColor: config.color }]} />
          <Text style={[typography.caption2, { color: config.color, fontWeight: '600' }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {prediction.reasons.map((reason, i) => (
        <View key={i} style={styles.reasonRow}>
          <View style={[styles.bulletDot, { backgroundColor: c.textMuted }]} />
          <Text style={[typography.body, { color: c.textSecondary, flex: 1 }]}>
            {reason}
          </Text>
        </View>
      ))}

      {prediction.tips.length > 0 && (
        <View style={[styles.tipsBox, { backgroundColor: c.surfaceAlt, borderColor: config.color + '30' }]}>
          <Text style={[typography.caption1, { color: c.text, marginBottom: spacing.xs }]}>
            アドバイス
          </Text>
          {prediction.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.bulletDot, { backgroundColor: palette.primary }]} />
              <Text style={[typography.caption1, { color: c.textSecondary, flex: 1, fontWeight: '400' }]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[typography.caption2, { color: c.textMuted, marginTop: spacing.sm }]}>
        ※ 食事内容からの一般的な目安であり、実際の血糖値の測定・予測ではありません。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
  },
  tipsBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 2,
  },
});
