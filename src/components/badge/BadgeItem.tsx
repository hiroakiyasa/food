import { View, Text, StyleSheet } from 'react-native';
import { palette, typography, spacing, radius, shadow, useThemeColors } from '@/src/lib/theme';
import type { BadgeWithStatus } from '@/src/hooks/useBadges';

interface BadgeItemProps {
  badge: BadgeWithStatus;
  isDark?: boolean;
}

export function BadgeItem({ badge, isDark = false }: BadgeItemProps) {
  const c = useThemeColors(isDark);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.surface, opacity: badge.earned ? 1 : 0.45 },
        shadow.sm,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${badge.name}${badge.earned ? '（獲得済み）' : '（未獲得）'}`}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: badge.earned ? palette.primaryLight : c.surfaceAlt,
          },
        ]}
      >
        <Text style={[styles.iconText, { color: badge.earned ? palette.primaryDark : c.textMuted }]}>
          {badge.earned ? 'B' : '?'}
        </Text>
      </View>
      <Text
        style={[typography.caption1, { color: c.text, textAlign: 'center' }]}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      <Text
        style={[typography.caption2, { color: c.textMuted, textAlign: 'center' }]}
        numberOfLines={2}
      >
        {badge.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 104,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
