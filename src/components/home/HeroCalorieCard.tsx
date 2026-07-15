import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalorieRing } from '@/src/components/chart/CalorieRing';
import { HeroPFCMini } from '@/src/components/home/HeroPFCMini';
import {
  palette, typography, spacing, radius, shadow, gradients, pressed,
} from '@/src/lib/theme';

interface HeroCalorieCardProps {
  currentCalories: number;
  targetCalories: number;
  score: number | null;
  feedbackMessage: string | null;
  isDark: boolean;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  proteinTarget: number;
  fatTarget: number;
  carbsTarget: number;
  fiberTarget: number;
}

function HeroCalorieCardComponent({
  currentCalories,
  targetCalories,
  score,
  feedbackMessage,
  isDark,
  protein,
  fat,
  carbs,
  fiber,
  proteinTarget,
  fatTarget,
  carbsTarget,
  fiberTarget,
}: HeroCalorieCardProps) {
  const router = useRouter();
  const isOver = targetCalories > 0 && currentCalories > targetCalories;
  const isEmpty = currentCalories === 0;
  const remainingKcal = Math.round(targetCalories - currentCalories);

  const gradientColors = isOver
    ? (isDark ? gradients.heroOverDark : gradients.heroOver)
    : (isDark ? gradients.heroPrimaryDark : gradients.heroPrimary);

  const cardShadow = isOver ? shadow.heroOver : shadow.hero;

  return (
    <View style={[styles.wrapper, cardShadow]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header row: score badge (left) + remaining kcal (right) */}
        <View style={styles.headerRow}>
          {score != null ? (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>🏆 {score}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.remainingBox}>
            <Text style={styles.remainingLabel}>
              {isOver ? '超過' : '残り'}
            </Text>
            <Text style={styles.remainingKcal}>
              {Math.abs(remainingKcal).toLocaleString()}
              <Text style={styles.remainingUnit}> kcal</Text>
            </Text>
          </View>
        </View>

        {isEmpty ? (
          /* Empty state */
          <View style={styles.emptyState}>
            <View style={styles.emptyRing}>
              <Text style={styles.emptyRingText}>?</Text>
            </View>
            <Text style={styles.emptyTitle}>今日の食事を記録しよう</Text>
            <View style={styles.emptyCTA}>
              <Pressable
                onPress={() => router.push('/(modals)/camera')}
                style={({ pressed: p }) => [styles.ctaButton, pressed(p)]}
                accessibilityRole="button"
                accessibilityLabel="写真で記録"
              >
                <Text style={styles.ctaText}>📷 写真で記録</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(modals)/food-search' as never)}
                style={({ pressed: p }) => [styles.ctaButtonSecondary, pressed(p)]}
                accessibilityRole="button"
                accessibilityLabel="食品を検索"
              >
                <Text style={styles.ctaTextSecondary}>🔍 食品を検索</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Main content: ring (left) + PFC bars (right) */
          <View style={styles.mainRow}>
            <CalorieRing
              current={currentCalories}
              target={targetCalories}
              size={180}
              strokeWidth={16}
              isDark={isDark}
            />
            <HeroPFCMini
              protein={protein}
              fat={fat}
              carbs={carbs}
              fiber={fiber}
              proteinTarget={proteinTarget}
              fatTarget={fatTarget}
              carbsTarget={carbsTarget}
              fiberTarget={fiberTarget}
            />
          </View>
        )}

        {/* Feedback message */}
        {feedbackMessage && (
          <Text style={styles.feedback} numberOfLines={2}>
            {feedbackMessage}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

export const HeroCalorieCard = React.memo(HeroCalorieCardComponent);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  gradient: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  scoreBadgeText: {
    color: '#FDE68A',
    ...typography.caption1,
    fontWeight: '700',
  },
  remainingBox: {
    alignItems: 'flex-end',
  },
  remainingLabel: {
    ...typography.caption2,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  remainingKcal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  remainingUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  // Main content row
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },

  // Feedback
  feedback: {
    ...typography.caption1,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  emptyRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRingText: {
    fontSize: 36,
    color: 'rgba(255,255,255,0.4)',
  },
  emptyTitle: {
    ...typography.title3,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  emptyCTA: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  ctaText: {
    color: '#FFFFFF',
    ...typography.caption1,
    fontWeight: '600',
  },
  ctaButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ctaTextSecondary: {
    color: 'rgba(255,255,255,0.85)',
    ...typography.caption1,
    fontWeight: '500',
  },
});
