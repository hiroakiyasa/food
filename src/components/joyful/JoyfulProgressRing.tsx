import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { palette } from '@/src/lib/theme';

interface JoyfulProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  accessibilityLabel: string;
}

function JoyfulProgressRingComponent({
  value,
  size = 92,
  strokeWidth = 10,
  color = palette.primary,
  trackColor = '#EAF1E9',
  label,
  accessibilityLabel,
}: JoyfulProgressRingProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = useMemo(
    () => circumference - (safeValue / 100) * circumference,
    [circumference, safeValue],
  );

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safeValue) }}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.label}>{label ?? `${Math.round(safeValue)}%`}</Text>
      </View>
    </View>
  );
}

export const JoyfulProgressRing = React.memo(JoyfulProgressRingComponent);

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
