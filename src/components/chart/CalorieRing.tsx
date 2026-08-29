import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { palette, typography } from '@/src/lib/theme';

interface CalorieRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
}

function CalorieRingComponent({
  current,
  target,
  size = 180,
  strokeWidth = 16,
  isDark,
}: CalorieRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = target > 0 ? current / target : 0;
  const isOver = ratio > 1;

  // State-based animation: shared value drives React state via useAnimatedReaction
  const progress = useSharedValue(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  const updateProgress = useCallback((val: number) => {
    setCurrentProgress(val);
  }, []);

  useAnimatedReaction(
    () => progress.value,
    (val) => {
      runOnJS(updateProgress)(val);
    },
    [updateProgress],
  );

  useEffect(() => {
    progress.value = withTiming(Math.min(ratio, 1.5), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio]);

  const dashOffset = circumference * (1 - currentProgress);
  const percent = Math.round(ratio * 100);
  // Always on dark bg (HeroCalorieCard uses dark gradient regardless of color scheme)
  const trackColor = 'rgba(255,255,255,0.15)';
  const gradId = isOver ? 'ringGradOver' : 'ringGrad';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6EE7B7" />
            <Stop offset="1" stopColor={palette.primary} />
          </LinearGradient>
          <LinearGradient id="ringGradOver" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.warning} />
            <Stop offset="1" stopColor={palette.error} />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center text — kcal is the primary actionable number */}
      <View style={styles.center}>
        <Text style={[styles.kcalNumber, { color: isOver ? '#FCD34D' : '#FFFFFF' }]}>
          {Math.round(current).toLocaleString()}
        </Text>
        <Text style={styles.kcalUnit}>kcal</Text>
        <Text style={[styles.percent, { color: isOver ? '#FCD34D' : 'rgba(255,255,255,0.6)' }]}>
          {percent}%
        </Text>
      </View>
    </View>
  );
}

export const CalorieRing = React.memo(CalorieRingComponent);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    gap: 0,
  },
  kcalNumber: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 34,
  },
  kcalUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  percent: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 18,
  },
});
