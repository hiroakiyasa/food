import { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile } from '@/src/hooks/useProfile';
import { PremiumLockCard } from '@/src/components/ui/PremiumLockCard';
import {
  useWeeklyMealPlan,
  useGenerateMealPlan,
  useAcceptMealPlan,
} from '@/src/hooks/useWeeklyMealPlan';
import { MealPlanCard } from '@/src/components/plan/MealPlanCard';
import { GroceryListCard } from '@/src/components/plan/GroceryListCard';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

type TabKey = 'plan' | 'grocery';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'plan', label: '食事プラン' },
  { key: 'grocery', label: '買い物リスト' },
];

function getWeekLabel(offsetWeeks = 0): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const suffix = offsetWeeks === 0 ? '（今週）' : offsetWeeks === 1 ? '（来週）' : offsetWeeks === -1 ? '（先週）' : '';
  return `${fmt(monday)} 〜 ${fmt(sunday)} ${suffix}`;
}

export default function MealPlanModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);

  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('plan');

  const { data: profile } = useProfile();
  const isPremium = profile?.is_premium ?? false;
  const { data: plan, isLoading } = useWeeklyMealPlan(weekOffset, { enabled: isPremium });
  const generatePlan = useGenerateMealPlan();
  const acceptPlan = useAcceptMealPlan();

  const handleGenerate = useCallback(() => {
    generatePlan.mutate({ weekOffset, force: !!plan });
  }, [generatePlan, weekOffset, plan]);

  const handleAccept = useCallback(() => {
    if (plan?.id) {
      acceptPlan.mutate(plan.id);
    }
  }, [acceptPlan, plan]);

  const isGenerating = generatePlan.isPending;
  const weeklyPlan = plan?.plan_data ?? null;
  const groceryList = plan?.grocery_list ?? null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.title2, { color: c.text }]}>週間食事プラン</Text>
        <Pressable
          onPress={() => router.dismiss()}
          style={({ pressed: p }) => [styles.closeBtn, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={[styles.closeBtnText, { color: c.textMuted }]}>×</Text>
        </Pressable>
      </View>

      {/* Premium gate */}
      {!isPremium && (
        <PremiumLockCard
          title="AI週間食事プラン"
          description="あなたの目標・嗜好・栄養状態に合わせて、AIが1週間分の食事プランと買い物リストを作成します。"
          features={[
            '目標に合わせた1週間の献立提案',
            'そのまま使える買い物リスト',
            '味覚の好みと疾患プロファイルを考慮',
          ]}
        />
      )}

      {isPremium && (
      <>
      {/* Week navigator */}
      <View style={[styles.weekNav, { backgroundColor: c.surface }, shadow.sm]}>
        <Pressable
          onPress={() => setWeekOffset((o) => o - 1)}
          style={({ pressed: p }) => [styles.navArrow, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="前の週へ"
        >
          <Text style={{ color: c.textSecondary, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text style={[typography.caption1, { color: c.text, flex: 1, textAlign: 'center' }]}>
          {getWeekLabel(weekOffset)}
        </Text>
        <Pressable
          onPress={() => setWeekOffset((o) => o + 1)}
          style={({ pressed: p }) => [styles.navArrow, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="次の週へ"
        >
          <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
        </Pressable>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.primary} />
          <Text style={[typography.caption1, { color: c.textMuted }]}>読み込み中...</Text>
        </View>
      )}

      {/* No plan state */}
      {!isLoading && !weeklyPlan && (
        <View style={[styles.emptyCard, { backgroundColor: c.surface }, shadow.sm]}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={[typography.title3, { color: c.text }]}>
            今週のプランがありません
          </Text>
          <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center' }]}>
            AIがあなたの栄養目標と{'\n'}過去の食事記録を分析して{'\n'}最適な1週間の食事プランを作成します
          </Text>
          <Pressable
            onPress={handleGenerate}
            disabled={isGenerating}
            style={({ pressed: p }) => [
              styles.generateBtn,
              { backgroundColor: isGenerating ? c.surfaceAlt : palette.primary },
              pressed(p),
            ]}
          >
            {isGenerating ? (
              <ActivityIndicator color={palette.white} size="small" />
            ) : (
              <Text style={[typography.bodyBold, { color: palette.white }]}>
                AIプランを生成する
              </Text>
            )}
          </Pressable>
          {generatePlan.isError && (
            <Text style={[typography.caption1, { color: palette.error, textAlign: 'center' }]}>
              生成に失敗しました。もう一度お試しください。
            </Text>
          )}
        </View>
      )}

      {/* Plan exists */}
      {weeklyPlan && (
        <>
          {/* Accept / Regenerate buttons */}
          <View style={styles.actionRow}>
            {!plan?.accepted && (
              <Pressable
                onPress={handleAccept}
                style={({ pressed: p }) => [
                  styles.acceptBtn,
                  { backgroundColor: palette.success },
                  pressed(p),
                ]}
              >
                <Text style={[typography.caption1, { color: palette.white, fontWeight: '700' }]}>
                  ✓ このプランを採用
                </Text>
              </Pressable>
            )}
            {plan?.accepted && (
              <View style={[styles.acceptedBadge, { backgroundColor: palette.success + '22' }]}>
                <Text style={[typography.caption1, { color: palette.success, fontWeight: '700' }]}>
                  ✓ 採用済み
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleGenerate}
              disabled={isGenerating}
              style={({ pressed: p }) => [
                styles.regenBtn,
                { borderColor: c.border, backgroundColor: c.surfaceAlt },
                pressed(p),
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : (
                <Text style={[typography.caption1, { color: c.textSecondary }]}>再生成</Text>
              )}
            </Pressable>
          </View>

          {/* Tab selector */}
          <View style={[styles.tabBar, { backgroundColor: c.surfaceAlt }]}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed: p }) => [
                  styles.tabItem,
                  activeTab === tab.key && { backgroundColor: c.surface },
                  pressed(p),
                ]}
              >
                <Text style={[
                  typography.caption1,
                  { color: activeTab === tab.key ? c.text : c.textMuted },
                  activeTab === tab.key && { fontWeight: '700' },
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === 'plan' && (
            <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
              <MealPlanCard plan={weeklyPlan} isDark={isDark} />
            </View>
          )}

          {activeTab === 'grocery' && groceryList && (
            <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
              <GroceryListCard groceryList={groceryList} isDark={isDark} />
            </View>
          )}

          {activeTab === 'grocery' && !groceryList && (
            <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
              <Text style={[typography.body, { color: c.textSecondary }]}>
                買い物リストがありません
              </Text>
            </View>
          )}
        </>
      )}
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  closeBtn: { padding: spacing.sm },
  closeBtnText: { fontSize: 24, lineHeight: 28 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  navArrow: { padding: spacing.sm },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyCard: {
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  emptyEmoji: { fontSize: 48 },
  generateBtn: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 200,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  acceptedBadge: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  regenBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 64,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
  },
});
