import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeItem } from '@/src/components/badge/BadgeItem';
import { useStreaks } from '@/src/hooks/useBadges';
import type { BadgeWithStatus } from '@/src/hooks/useBadges';
import { palette, typography, spacing, radius, shadow } from '@/src/lib/theme';

interface AchievementShowcaseProps {
  badges: BadgeWithStatus[];
  isDark: boolean;
}

function AchievementShowcaseComponent({ badges, isDark }: AchievementShowcaseProps) {
  const { data: streaks = [] } = useStreaks();
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';
  const surfaceAlt = isDark ? '#334155' : '#F1F5F9';

  const earnedBadges = badges.filter((b) => b.earned);
  const recordingStreak = streaks.find((s) => s.streak_type === 'daily_recording');

  return (
    <View style={styles.container}>
      {/* Streak display */}
      {recordingStreak && recordingStreak.current_count > 0 && (
        <View style={[styles.streakCard, { backgroundColor: surfaceAlt }]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakInfo}>
            <Text style={[styles.streakCount, { color: palette.warning }]}>
              {recordingStreak.current_count}日連続
            </Text>
            <Text style={[styles.streakLabel, { color: textMuted }]}>
              記録ストリーク（最高: {recordingStreak.longest_count}日）
            </Text>
          </View>
        </View>
      )}

      {/* Earned badges with glow */}
      {earnedBadges.length > 0 ? (
        <View style={styles.badgeGrid}>
          {earnedBadges.map((badge) => (
            <View key={badge.id} style={styles.badgeWrap}>
              <View style={[styles.glowBg, { backgroundColor: palette.primaryMuted }]} />
              <BadgeItem badge={badge} isDark={isDark} />
            </View>
          ))}
        </View>
      ) : (
        <Text style={[typography.caption1, { color: textMuted, textAlign: 'center', paddingVertical: spacing.xl }]}>
          バッジを獲得しましょう
        </Text>
      )}

      {/* Unearned count */}
      {badges.length > earnedBadges.length && (
        <Text style={[styles.unearnedText, { color: textMuted }]}>
          残り{badges.length - earnedBadges.length}個のバッジ
        </Text>
      )}
    </View>
  );
}

export const AchievementShowcase = React.memo(AchievementShowcaseComponent);

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakInfo: {
    flex: 1,
    gap: 2,
  },
  streakCount: {
    ...typography.title3,
    fontWeight: '700',
  },
  streakLabel: {
    ...typography.caption2,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBg: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.5,
  },
  unearnedText: {
    ...typography.caption2,
    textAlign: 'center',
  },
});
