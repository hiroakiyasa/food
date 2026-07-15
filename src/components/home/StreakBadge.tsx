import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreaks } from '@/src/hooks/useBadges';
import {
  palette, typography, spacing, radius, pressed, gradients, useThemeColors,
} from '@/src/lib/theme';

interface StreakBadgeProps {
  isDark: boolean;
  onPress?: () => void;
}

function StreakBadgeComponent({ isDark, onPress }: StreakBadgeProps) {
  const c = useThemeColors(isDark);
  const { data: streaks = [] } = useStreaks();

  const dailyStreak = streaks.find((s) => s.streak_type === 'daily_logging');
  const count = dailyStreak?.current_count ?? 0;

  // count=0: show "start recording" prompt
  if (count === 0) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed: p }) => [
          styles.badge,
          { backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderColor: isDark ? '#334155' : '#D1FAE5', borderWidth: 1 },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel="記録を始めよう"
        disabled={!onPress}
      >
        <Text style={styles.icon}>🌱</Text>
        <Text style={[styles.zeroText, { color: palette.primaryDark }]}>記録を始めよう</Text>
      </Pressable>
    );
  }

  // count >= 30: platinum gradient
  if (count >= 30) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed: p }) => [styles.gradientWrapper, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel={`${count}日連続記録中`}
        disabled={!onPress}
      >
        <LinearGradient
          colors={gradients.streak30}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBadge}
        >
          <Text style={styles.icon}>🏆</Text>
          <Text style={styles.gradientCount}>{count}</Text>
          <Text style={styles.gradientLabel}>日連続</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  // count >= 7: flame gradient
  if (count >= 7) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed: p }) => [styles.gradientWrapper, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel={`${count}日連続記録中`}
        disabled={!onPress}
      >
        <LinearGradient
          colors={gradients.streak7}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBadge}
        >
          <Text style={styles.icon}>🔥</Text>
          <Text style={styles.gradientCount}>{count}</Text>
          <Text style={styles.gradientLabel}>日連続</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  // count 1-6: standard badge
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.badge,
        { backgroundColor: isDark ? '#1E293B' : '#FEF3C7' },
        pressed(p),
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${count}日連続記録中`}
      disabled={!onPress}
    >
      <Text style={styles.icon}>🔥</Text>
      <Text style={[styles.count, { color: palette.warning }]}>{count}</Text>
      <Text style={[typography.caption1, { color: isDark ? '#FDE68A' : '#92400E' }]}>
        日連続
      </Text>
    </Pressable>
  );
}

export const StreakBadge = React.memo(StreakBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  icon: { fontSize: 16 },
  count: { ...typography.bodyBold, fontSize: 15 },
  zeroText: {
    ...typography.caption1,
    fontWeight: '600',
  },

  // Gradient variants
  gradientWrapper: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  gradientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  gradientCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gradientLabel: {
    ...typography.caption1,
    color: 'rgba(255,255,255,0.85)',
  },
});
