import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { JoyfulProgressRing } from '@/src/components/joyful/JoyfulProgressRing';
import { palette, pressed, radius, shadow, spacing, typography } from '@/src/lib/theme';

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

interface MacroPetalProps {
  label: string;
  name: string;
  value: number;
  target: number;
  color: string;
  soft: string;
}

function MacroPetal({ label, name, value, target, color, soft }: MacroPetalProps) {
  const progress = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <View
      style={[styles.petal, { backgroundColor: soft, borderColor: color }]}
      accessible
      accessibilityLabel={`${name} ${value.toFixed(0)}グラム、目標の${progress}パーセント`}
    >
      <Text style={[styles.petalLabel, { color }]}>{label}</Text>
      <Text style={[styles.petalValue, { color }]}>{value.toFixed(0)}g</Text>
    </View>
  );
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
  proteinTarget,
  fatTarget,
  carbsTarget,
}: HeroCalorieCardProps) {
  const router = useRouter();
  const isEmpty = currentCalories === 0;
  const remaining = targetCalories - currentCalories;
  const progress = targetCalories > 0 ? (currentCalories / targetCalories) * 100 : 0;
  const meterScore = score ?? Math.min(100, Math.round(progress));
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const text = isDark ? '#F1F5F9' : palette.ink;
  const muted = isDark ? '#8D9993' : '#66766F';

  if (isEmpty) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: surface }]}>
        <View style={styles.emptyIcon}>
          <FontAwesome name="leaf" size={26} color={palette.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: text }]}>最初の食事で、今日の花を咲かせよう</Text>
        <Text style={[styles.emptyBody, { color: muted }]}>写真なら数秒で記録できます</Text>
        <Pressable
          onPress={() => router.push('/(modals)/camera')}
          style={({ pressed: isPressed }) => [styles.emptyButton, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="写真で最初の食事を記録"
        >
          <FontAwesome name="camera" size={18} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>写真で記録</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/(modals)/nutrition-balance')}
      style={({ pressed: isPressed }) => [
        styles.card,
        { backgroundColor: surface },
        pressed(isPressed),
      ]}
      accessibilityRole="button"
      accessibilityLabel={`今日の元気メーター${meterScore}点、栄養バランスを見る`}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: text }]}>今日の元気メーター</Text>
          <Text style={[styles.subtitle, { color: muted }]}>食事からみた今日のバランス</Text>
        </View>
        <FontAwesome name="leaf" size={21} color={palette.primary} />
      </View>

      <View style={styles.mainRow}>
        <View style={styles.scoreBlock}>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: text }]}>{meterScore}</Text>
            <View style={styles.mood}>
              <FontAwesome name="smile-o" size={24} color={palette.primaryDark} />
            </View>
          </View>
          <Text style={[styles.calorieText, { color: muted }]}>
            <Text style={styles.calorieCurrent}>{Math.round(currentCalories).toLocaleString('ja-JP')}</Text>
            {' / '}{Math.round(targetCalories).toLocaleString('ja-JP')} kcal
          </Text>
          <Text style={[styles.remaining, { color: remaining < 0 ? palette.error : palette.apricot }]}>
            {remaining < 0 ? `${Math.abs(Math.round(remaining))} kcal オーバー` : `あと ${Math.round(remaining)} kcal`}
          </Text>
        </View>

        <View style={styles.nutritionVisual}>
          <JoyfulProgressRing
            value={progress}
            size={126}
            strokeWidth={12}
            label={`${Math.round(progress)}%`}
            accessibilityLabel="カロリー目標の達成率"
          />
          <View style={styles.petalsRow}>
            <MacroPetal label="P" name="たんぱく質" value={protein} target={proteinTarget} color={palette.protein} soft="#FCE5ED" />
            <MacroPetal label="F" name="脂質" value={fat} target={fatTarget} color={palette.fat} soft="#FFF3D5" />
            <MacroPetal label="C" name="炭水化物" value={carbs} target={carbsTarget} color="#278DC8" soft={palette.accentLight} />
          </View>
        </View>
      </View>

      {feedbackMessage && (
        <View style={styles.feedbackBox}>
          <FontAwesome name="star" size={14} color={palette.warning} />
          <Text style={[styles.feedback, { color: text }]} numberOfLines={2}>{feedbackMessage}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const HeroCalorieCard = React.memo(HeroCalorieCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title2 },
  subtitle: { ...typography.caption1, marginTop: 2 },
  mainRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.md },
  scoreBlock: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  score: {
    fontSize: 72,
    lineHeight: 78,
    fontWeight: '800',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  mood: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.lemon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieText: { fontSize: 13, fontWeight: '600' },
  calorieCurrent: { color: palette.primary, fontSize: 20, fontWeight: '800' },
  remaining: { marginTop: 4, fontSize: 12, fontWeight: '800' },
  nutritionVisual: { alignItems: 'center', gap: spacing.sm },
  petalsRow: { flexDirection: 'row', gap: 5, marginTop: -18 },
  petal: {
    width: 48,
    minHeight: 53,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petalLabel: { fontSize: 12, fontWeight: '900' },
  petalValue: { fontSize: 10, fontWeight: '700' },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF5D8',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.lg,
  },
  feedback: { flex: 1, ...typography.caption1 },
  emptyCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadow.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.title2, textAlign: 'center' },
  emptyBody: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: {
    minHeight: 50,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
