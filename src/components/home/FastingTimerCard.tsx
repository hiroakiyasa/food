import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFasting } from '@/src/hooks/useFasting';
import { formatRemainingTime, formatTime } from '@/src/services/fasting/fastingEngine';
import {
  palette, typography, spacing, radius, shadow, pressed,
} from '@/src/lib/theme';

interface FastingTimerCardProps {
  isDark: boolean;
}

function FastingTimerCardComponent({ isDark }: FastingTimerCardProps) {
  const router = useRouter();
  const { fastingState, isActive, isEnabled, activeSession, selectedProtocolConfig, stopFasting } = useFasting();

  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#66766F' : '#8D9993';
  const borderColor = isDark ? '#334155' : '#E9E5D8';

  // 断食機能が無効で、かつアクティブセッションもない場合は非表示
  if (!isEnabled && !isActive) return null;

  const isFasting = fastingState.phase === 'fasting';
  const isEating = fastingState.phase === 'eating';
  const progressPercent = Math.round(fastingState.progress * 100);

  const phaseColor = isFasting ? '#6366F1' : isEating ? palette.primary : textMuted;
  const phaseLabel = isFasting ? '断食中' : isEating ? '食事ウィンドウ' : '完了';
  const phaseEmoji = isFasting ? '🌙' : isEating ? '🍽️' : '✅';

  return (
    <View style={[styles.card, { backgroundColor: surface }, shadow.md]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>{phaseEmoji}</Text>
          <View>
            <Text style={[typography.caption2, { color: textMuted }]}>時間制限食</Text>
            <Text style={[typography.bodyBold, { color: textColor }]}>
              {selectedProtocolConfig?.label ?? activeSession?.protocol ?? '16:8'}
            </Text>
          </View>
        </View>
        <View style={[styles.phaseTag, { backgroundColor: phaseColor + '22' }]}>
          <Text style={[typography.caption2, { color: phaseColor, fontWeight: '700' }]}>
            {phaseLabel}
          </Text>
        </View>
      </View>

      {/* Timer */}
      {isActive && (fastingState.phase === 'fasting' || fastingState.phase === 'eating') && (
        <>
          <Text style={[styles.timerText, { color: phaseColor }]}>
            {formatRemainingTime(fastingState.remainingSeconds)}
          </Text>
          <Text style={[typography.caption1, { color: textMuted, textAlign: 'center', marginBottom: spacing.md }]}>
            残り時間
          </Text>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%` as `${number}%`,
                  backgroundColor: phaseColor,
                },
              ]}
            />
          </View>
          <Text style={[typography.caption2, { color: textMuted, textAlign: 'center', marginTop: 4 }]}>
            {progressPercent}% 完了
          </Text>

          {/* Eat window */}
          {fastingState.eatStart && fastingState.eatEnd && (
            <View style={[styles.windowRow, { borderTopColor: borderColor }]}>
              <Text style={[typography.caption1, { color: textMuted }]}>
                食事ウィンドウ
              </Text>
              <Text style={[typography.caption1, { color: palette.primary, fontWeight: '700' }]}>
                {formatTime(fastingState.eatStart)} 〜 {formatTime(fastingState.eatEnd)}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={stopFasting}
              style={({ pressed: p }) => [styles.stopButton, { borderColor }, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="断食を終了する"
            >
              <Text style={[typography.caption1, { color: textMuted, fontWeight: '600' }]}>
                断食を終了する
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Not active — show start button */}
      {!isActive && (
        <Pressable
          onPress={() => router.push('/(modals)/fasting-setup' as never)}
          style={({ pressed: p }) => [styles.startButton, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="断食を設定する"
        >
          <Text style={styles.startButtonText}>断食を設定する</Text>
        </Pressable>
      )}
    </View>
  );
}

export const FastingTimerCard = React.memo(FastingTimerCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleEmoji: {
    fontSize: 22,
  },
  phaseTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  timerText: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    marginTop: spacing.md,
  },
  stopButton: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startButtonText: {
    color: palette.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
