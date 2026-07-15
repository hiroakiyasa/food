import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import type { NutrientStatus } from '@/src/types/nutrientBalance';
import { typography, spacing, radius } from '@/src/lib/theme';

interface NutrientBarProps {
  nameJa: string;
  currentValue: number;
  targetValue: number;
  ratio: number;
  status: NutrientStatus;
  color: string;
  unit: string;
  isDark: boolean;
  isEstimated?: boolean;
}

const STATUS_CONFIG: Record<NutrientStatus, { label: string; bg: string; text: string }> = {
  deficient: { label: '不足', bg: '#3B82F620', text: '#3B82F6' },
  adequate: { label: '適正', bg: '#22C55E20', text: '#22C55E' },
  excessive: { label: '過剰', bg: '#EF444420', text: '#EF4444' },
};

function NutrientBarComponent({
  nameJa,
  currentValue,
  targetValue,
  ratio,
  status,
  color,
  unit,
  isDark,
  isEstimated,
}: NutrientBarProps) {
  const barBg = isDark ? '#334155' : '#E9E5D8';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';
  const adequateZoneBg = isDark ? '#22C55E10' : '#22C55E15';
  const sc = STATUS_CONFIG[status];

  // State-based animation: shared value drives React state via useAnimatedReaction
  const animProgress = useSharedValue(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  const updateProgress = useCallback((val: number) => {
    setCurrentProgress(val);
  }, []);

  useAnimatedReaction(
    () => animProgress.value,
    (val) => {
      runOnJS(updateProgress)(val);
    },
    [updateProgress],
  );

  useEffect(() => {
    animProgress.value = withTiming(Math.min(ratio, 1.5), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio]);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  // Compute pixel widths from percentage-based values
  const fillWidth = barWidth * Math.min(currentProgress, 1.5);
  const adequateLeft = barWidth * 0.6;
  const adequateWidth = barWidth * 0.7;
  const targetLeft = barWidth;

  const displayValue = unit === 'kcal'
    ? Math.round(currentValue).toString()
    : currentValue < 10
      ? currentValue.toFixed(1)
      : Math.round(currentValue).toString();

  return (
    <View style={styles.row}>
      {/* Name */}
      <View style={styles.nameCol}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {nameJa}
        </Text>
        {isEstimated && (
          <Text style={[styles.estimated, { color: textMuted }]}>推定</Text>
        )}
      </View>

      {/* Status badge */}
      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
        <Text style={[styles.badgeText, { color: sc.text }]}>{sc.label}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barCol}>
        <View
          style={[styles.barBg, { backgroundColor: barBg }]}
          onLayout={onBarLayout}
        >
          {/* Adequate zone indicator (60-130%) */}
          <View
            style={[
              styles.adequateZone,
              {
                left: adequateLeft,
                width: adequateWidth,
                backgroundColor: adequateZoneBg,
              },
            ]}
          />
          {/* Target line */}
          <View style={[styles.targetLine, { left: targetLeft }]} />
          {/* Fill */}
          <View
            style={[styles.barFill, { backgroundColor: color, width: fillWidth }]}
          />
        </View>
      </View>

      {/* Value */}
      <View style={styles.valueCol}>
        <Text style={[styles.value, { color: textColor }]}>
          {displayValue}
        </Text>
        <Text style={[styles.unit, { color: textMuted }]}>{unit}</Text>
      </View>
    </View>
  );
}

export const NutrientBar = React.memo(NutrientBarComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  nameCol: {
    width: 80,
  },
  name: {
    ...typography.caption1,
  },
  estimated: {
    ...typography.caption2,
    fontSize: 9,
  },
  badge: {
    width: 44,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  barCol: {
    flex: 1,
    height: 12,
  },
  barBg: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  adequateZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  targetLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#66766F40',
    zIndex: 1,
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 6,
  },
  valueCol: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 2,
  },
  value: {
    ...typography.caption1,
    fontWeight: '700',
  },
  unit: {
    fontSize: 9,
  },
});
