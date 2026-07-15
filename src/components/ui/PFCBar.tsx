import { View, Text, StyleSheet } from 'react-native';
import { palette, radius, typography, spacing } from '@/src/lib/theme';

interface PFCBarProps {
  protein: number;
  fat: number;
  carbs: number;
  targetProtein?: number;
  targetFat?: number;
  targetCarbs?: number;
  isDark?: boolean;
}

export function PFCBar({
  protein,
  fat,
  carbs,
  targetProtein,
  targetFat,
  targetCarbs,
  isDark = false,
}: PFCBarProps) {
  const total = protein + fat + carbs || 1;
  const pPct = (protein / total) * 100;
  const fPct = (fat / total) * 100;
  const cPct = (carbs / total) * 100;

  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const mutedColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`P ${protein.toFixed(0)}g, F ${fat.toFixed(0)}g, C ${carbs.toFixed(0)}g`}
    >
      <View style={[styles.bar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
        {pPct > 0 && <View style={[styles.segment, styles.segmentFirst, { flex: pPct, backgroundColor: palette.protein }]} />}
        {fPct > 0 && <View style={[styles.segment, { flex: fPct, backgroundColor: palette.fat }]} />}
        {cPct > 0 && <View style={[styles.segment, styles.segmentLast, { flex: cPct, backgroundColor: palette.carbs }]} />}
      </View>
      <View style={styles.legend}>
        {[
          { label: 'P', value: protein, target: targetProtein, color: palette.protein },
          { label: 'F', value: fat, target: targetFat, color: palette.fat },
          { label: 'C', value: carbs, target: targetCarbs, color: palette.carbs },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: textColor }]}>
              {item.label} {item.value.toFixed(0)}g
            </Text>
            {item.target != null && (
              <Text style={[styles.targetText, { color: mutedColor }]}>/ {item.target}g</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
  segmentFirst: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  segmentLast: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    ...typography.caption1,
  },
  targetText: {
    ...typography.caption2,
  },
});
