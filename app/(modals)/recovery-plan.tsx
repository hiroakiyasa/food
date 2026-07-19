import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile } from '@/src/hooks/useProfile';
import { useRecoveryPlan } from '@/src/hooks/useRecoveryPlan';
import { useWeeklyBuffer } from '@/src/hooks/useWeeklyBuffer';
import { PremiumLockCard } from '@/src/components/ui/PremiumLockCard';
import { getToday, formatCalories } from '@/src/utils/formatters';
import { MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

export default function RecoveryPlanModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const today = getToday();
  const { data: profile } = useProfile();
  const isPremium = profile?.is_premium ?? false;
  const { data: weeklyBuffer } = useWeeklyBuffer(today);
  const recoveryPlan = useRecoveryPlan();

  useEffect(() => {
    if (isPremium) {
      recoveryPlan.mutate();
    }
  }, [isPremium]);

  const bufferUsed = weeklyBuffer?.buffer_used_kcal ?? 0;
  const bufferTotal = weeklyBuffer?.buffer_total_kcal ?? 0;
  const overageKcal = Math.max(0, bufferUsed - bufferTotal);

  if (!isPremium) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PremiumLockCard
          title="リカバリープラン"
          description="食べすぎた週も大丈夫。AIが数日かけて無理なく整えるリカバリープランを作成します。"
          features={[
            '超過分をならす数日分の食事プラン',
            '極端な制限をしない現実的な調整',
            '週間バッファと連動した提案',
          ]}
        />
        <Pressable
          onPress={() => router.dismiss()}
          style={({ pressed: p }) => [commonStyles.buttonPrimary, { marginTop: spacing.md }, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={commonStyles.buttonText}>閉じる</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header message */}
      <View style={[styles.headerCard, { backgroundColor: palette.primaryLight }]}>
        <Text style={[typography.title2, { color: palette.primaryDark }]}>
          リカバリーできます
        </Text>
        <Text style={[typography.body, { color: palette.primaryDark, marginTop: spacing.xs }]}>
          {overageKcal > 0
            ? '週間バッファを超過しましたが、下記のプランで調整すれば問題ありません。無理な制限は不要です。'
            : '現在は週間バッファの範囲内です。今後に備えて、無理なく整えるプランを提案します。'}
        </Text>
        {overageKcal > 0 && (
          <Text style={[typography.caption1, { color: palette.primaryDark, marginTop: spacing.sm, opacity: 0.7 }]}>
            超過分: {formatCalories(overageKcal)}
          </Text>
        )}
      </View>

      {/* Recovery plan */}
      {recoveryPlan.isPending && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[typography.body, { color: c.textMuted }]}>プランを作成中...</Text>
        </View>
      )}

      {recoveryPlan.isError && (
        <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
          <Text style={[typography.body, { color: palette.error, textAlign: 'center', marginBottom: spacing.md }]}>
            プランの生成に失敗しました
          </Text>
          <Pressable
            onPress={() => recoveryPlan.mutate()}
            style={({ pressed: p }) => [
              commonStyles.buttonPrimary,
              { backgroundColor: palette.accent, alignSelf: 'center' },
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel="再試行"
          >
            <Text style={commonStyles.buttonText}>再試行</Text>
          </Pressable>
        </View>
      )}

      {recoveryPlan.data && (
        <>
          {recoveryPlan.data.message && (
            <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing.lg }]}>
              {recoveryPlan.data.message}
            </Text>
          )}

          {recoveryPlan.data.days.map((day) => (
            <View
              key={day.day}
              style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.md }]}
            >
              <View style={styles.dayHeader}>
                <Text style={[typography.title3, { color: c.text }]}>Day {day.day}</Text>
                <Text style={[typography.caption1, { color: c.textMuted }]}>
                  目標 {formatCalories(day.target_kcal)}
                </Text>
              </View>

              {day.meals.map((meal, i) => (
                <View
                  key={i}
                  style={[
                    styles.mealRow,
                    { borderBottomColor: c.divider },
                    i === day.meals.length - 1 && day.tips.length === 0 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={[typography.caption2, { color: c.textMuted, marginBottom: 2 }]}>
                    {MEAL_TYPE_LABELS[meal.meal_type as MealType] ?? meal.meal_type}
                  </Text>
                  <Text style={[typography.bodyBold, { color: c.text }]}>
                    {meal.description}
                  </Text>
                  <Text style={[typography.caption1, { color: c.textMuted }]}>
                    {formatCalories(meal.kcal)}
                  </Text>
                </View>
              ))}

              {day.tips.length > 0 && (
                <View style={[styles.tipsContainer, { backgroundColor: c.surfaceAlt }]}>
                  {day.tips.map((tip, i) => (
                    <View key={i} style={styles.tipRow}>
                      <View style={[styles.tipDot, { backgroundColor: palette.primary }]} />
                      <Text style={[typography.caption1, { color: palette.primaryDark, flex: 1, fontWeight: '400' }]}>
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </>
      )}

      <Pressable
        onPress={() => router.dismiss()}
        style={({ pressed: p }) => [commonStyles.buttonPrimary, { marginTop: spacing.md }, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel="閉じる"
      >
        <Text style={commonStyles.buttonText}>閉じる</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing['4xl'],
    gap: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mealRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  tipsContainer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 2,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
  },
});
