import { View, Text, StyleSheet } from 'react-native';
import { palette, typography } from '@/src/lib/theme';

type TrafficColor = 'green' | 'amber' | 'red';

const TRAFFIC_COLORS: Record<TrafficColor, string> = {
  green: palette.green,
  amber: palette.amber,
  red: palette.red,
};

const TRAFFIC_LABELS: Record<TrafficColor, string> = {
  green: '良好',
  amber: '注意',
  red: '要注意',
};

interface TrafficLightBadgeProps {
  color: TrafficColor;
  label?: string;
  size?: number;
}

export function TrafficLightBadge({ color, label, size = 8 }: TrafficLightBadgeProps) {
  const dotColor = TRAFFIC_COLORS[color];

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${TRAFFIC_LABELS[color]}${label ? `: ${label}` : ''}`}
    >
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: dotColor,
          },
        ]}
      />
      {/* Glow ring */}
      <View
        style={[
          styles.glow,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: dotColor + '20',
            position: 'absolute',
          },
        ]}
      />
      {label && <Text style={[styles.label, { color: dotColor }]}>{label}</Text>}
    </View>
  );
}

export function getItemTrafficLight(item: {
  energy_kcal: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  carbohydrate_g: number | null;
  portion_grams: number | null;
}): TrafficColor {
  const portion = item.portion_grams ?? 100;
  if (portion === 0) return 'green';

  const fatPer100 = ((item.fat_g ?? 0) / portion) * 100;
  const saltPer100 = (((item.sodium_mg ?? 0) / 1000) * 2.54 / portion) * 100;

  if (fatPer100 > 17.5 || saltPer100 > 1.5) return 'red';
  if (fatPer100 > 3 || saltPer100 > 0.3) return 'amber';
  return 'green';
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'relative' },
  dot: { zIndex: 1 },
  glow: { zIndex: 0 },
  label: { ...typography.caption2 },
});
