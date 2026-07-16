import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAdaptiveCoach, useAcceptAdaptiveTarget } from '@/src/hooks/useAdaptiveCoach';
import { useBehaviorCheckin, useSaveBehaviorCheckin } from '@/src/hooks/useBehaviorCheckin';
import { createNextMealSuggestion } from '@/src/services/coaching/nextMealCoach';
import { palette, pressed, radius, shadow, spacing, typography } from '@/src/lib/theme';

type Props = {
  totals: { calories: number; protein: number; fiber: number; sodium: number };
  targets: { calories: number; protein: number; fiber: number; sodium: number };
  isDark: boolean;
};

export function DailyCoachCard({ totals, targets, isDark }: Props) {
  const router = useRouter();
  const { data: adaptive } = useAdaptiveCoach();
  const acceptTarget = useAcceptAdaptiveTarget();
  const { data: checkin } = useBehaviorCheckin();
  const saveCheckin = useSaveBehaviorCheckin();
  const suggestion = createNextMealSuggestion({
    hour: new Date().getHours(),
    calories: totals.calories,
    proteinG: totals.protein,
    fiberG: totals.fiber,
    sodiumMg: totals.sodium,
    targetCalories: targets.calories,
    targetProteinG: targets.protein,
    targetFiberG: targets.fiber,
    targetSodiumMg: targets.sodium,
  });
  const background = isDark ? '#1E293B' : '#FFFFFF';
  const text = isDark ? '#F1F5F9' : '#153D32';
  const muted = isDark ? '#A8B4AF' : '#61736D';
  const accent = suggestion.tone === 'recover' ? palette.berry : palette.primary;

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${accent}20` }]}>
          <FontAwesome name="magic" size={18} color={accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: accent }]}>NEXT MEAL COACH</Text>
          <Text style={[styles.title, { color: text }]}>{suggestion.title}</Text>
        </View>
      </View>
      <Text style={[styles.message, { color: muted }]}>{suggestion.message}</Text>
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => router.push(`/(modals)/food-search?mealType=${suggestion.mealType}` as never)}
          style={({ pressed: isPressed }) => [styles.primaryButton, { backgroundColor: accent }, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="おすすめの食品を探す"
        >
          <Text style={styles.primaryButtonText}>食品を探す</Text>
          <FontAwesome name="chevron-right" size={12} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() => saveCheckin.mutate({ tiny_action: suggestion.tinyAction, completed: !checkin?.completed })}
          style={({ pressed: isPressed }) => [
            styles.tinyAction,
            { borderColor: checkin?.completed ? palette.primary : '#D9E1DD' },
            pressed(isPressed),
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!checkin?.completed }}
        >
          <FontAwesome name={checkin?.completed ? 'check-circle' : 'circle-o'} size={15} color={palette.primary} />
          <Text style={[styles.tinyActionText, { color: text }]} numberOfLines={2}>{suggestion.tinyAction}</Text>
        </Pressable>
      </View>

      <View style={[styles.hungerRow, { borderTopColor: isDark ? '#334155' : '#EDF1EF' }]}>
        <Text style={[styles.hungerLabel, { color: muted }]}>今の空腹</Text>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => saveCheckin.mutate({ hunger: value, tiny_action: suggestion.tinyAction })}
            style={({ pressed: isPressed }) => [
              styles.hungerChip,
              checkin?.hunger === value && styles.hungerChipActive,
              pressed(isPressed),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`空腹度${value}`}
            accessibilityState={{ selected: checkin?.hunger === value }}
          >
            <Text style={[styles.hungerChipText, checkin?.hunger === value && styles.hungerChipTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      {adaptive && Math.abs(adaptive.result.recommendedEnergyKcal - adaptive.target.energy_kcal) >= 20 && (
        <View style={[styles.adaptiveBox, { backgroundColor: isDark ? '#183A31' : '#EFF9F2' }]}>
          <View style={styles.adaptiveHeader}>
            <View>
              <Text style={[styles.adaptiveLabel, { color: palette.primaryDark }]}>今週のやさしい調整</Text>
              <Text style={[styles.adaptiveValue, { color: text }]}>
                {adaptive.target.energy_kcal} → {adaptive.result.recommendedEnergyKcal} kcal
              </Text>
            </View>
            <Text style={[styles.confidence, { color: muted }]}>確度 {Math.round(adaptive.result.confidence * 100)}%</Text>
          </View>
          <Text style={[styles.adaptiveExplanation, { color: muted }]}>{adaptive.result.explanation}</Text>
          <Pressable
            onPress={() => acceptTarget.mutate(adaptive)}
            disabled={acceptTarget.isPending}
            style={({ pressed: isPressed }) => [styles.adaptiveButton, pressed(isPressed)]}
            accessibilityRole="button"
            accessibilityLabel="今週の栄養目標を更新"
          >
            <Text style={styles.adaptiveButtonText}>{acceptTarget.isPending ? '更新中…' : 'この目標で試す'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.xl, ...shadow.md },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { ...typography.caption2, fontWeight: '800', letterSpacing: 1 },
  title: { ...typography.title3 },
  message: { ...typography.body, lineHeight: 23 },
  actionRow: { gap: spacing.sm },
  primaryButton: { minHeight: 46, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryButtonText: { ...typography.bodyBold, color: '#FFFFFF' },
  tinyAction: { minHeight: 44, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tinyActionText: { ...typography.caption1, flex: 1 },
  hungerRow: { paddingTop: spacing.md, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hungerLabel: { ...typography.caption1, marginRight: 'auto' },
  hungerChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF2F0', alignItems: 'center', justifyContent: 'center' },
  hungerChipActive: { backgroundColor: palette.primary },
  hungerChipText: { ...typography.caption1, color: '#52645D', fontWeight: '700' },
  hungerChipTextActive: { color: '#FFFFFF' },
  adaptiveBox: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  adaptiveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  adaptiveLabel: { ...typography.caption1, fontWeight: '700' },
  adaptiveValue: { ...typography.title3, marginTop: 2 },
  confidence: { ...typography.caption2 },
  adaptiveExplanation: { ...typography.caption1, lineHeight: 19 },
  adaptiveButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: radius.full, backgroundColor: palette.primary, justifyContent: 'center', paddingHorizontal: spacing.lg },
  adaptiveButtonText: { ...typography.caption1, color: '#FFFFFF', fontWeight: '700' },
});
