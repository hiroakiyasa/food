import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import { useNutrientBalance } from '@/src/hooks/useNutrientBalance';
import { buildGardenBalance, GARDEN_NUTRIENT_KEYS } from '@/src/lib/gardenBalance';
import { getToday } from '@/src/utils/formatters';
import type {
  BeanGrowthStage,
  ElementFountainState,
  NutrientBalanceItem,
} from '@/src/types/nutrientBalance';
import {
  palette, typography, spacing, radius, shadow, pressed, useThemeColors,
} from '@/src/lib/theme';

type ScopeTab = 'daily' | 'meal';

const ALBUM_STAGES: {
  key: BeanGrowthStage;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  { key: 'seed', title: 'Seed', subtitle: 'はじまり', icon: '●' },
  { key: 'sprout', title: 'Sprout', subtitle: 'めばえ', icon: '◐' },
  { key: 'leafy', title: 'Leafy', subtitle: '成長中', icon: '◕' },
  { key: 'bloom', title: 'Bloom', subtitle: '開花', icon: '✿' },
  { key: 'shine', title: 'Shine', subtitle: 'きらめき', icon: '✦' },
];

function stageLabel(stage: BeanGrowthStage): string {
  switch (stage) {
    case 'seed':
      return 'Seed';
    case 'sprout':
      return 'Sprout';
    case 'leafy':
      return 'Leafy';
    case 'bloom':
      return 'Bloom';
    case 'shine':
      return 'Shine';
    default:
      return 'Seed';
  }
}

function orderGardenNutrients(nutrients: NutrientBalanceItem[]): NutrientBalanceItem[] {
  const keyOrder = new Map(GARDEN_NUTRIENT_KEYS.map((key, idx) => [key, idx]));
  return [...nutrients]
    .filter((nutrient) => keyOrder.has(nutrient.key))
    .sort((a, b) => (keyOrder.get(a.key) ?? 999) - (keyOrder.get(b.key) ?? 999));
}

function GrowingBean({
  growthScore,
  growthStage,
  isDark,
}: {
  growthScore: number;
  growthStage: BeanGrowthStage;
  isDark: boolean;
}) {
  const growth = useSharedValue(growthScore);
  const bob = useSharedValue(0);

  useEffect(() => {
    growth.value = withTiming(growthScore, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [growth, growthScore]);

  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, {
        duration: 1700,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [bob]);

  const bodyStyle = useAnimatedStyle(() => {
    const scale = interpolate(growth.value, [0, 1], [0.88, 1.18]);
    const bounce = interpolate(bob.value, [0, 1], [3, -6]);
    const lift = interpolate(growth.value, [0, 1], [0.7, 1.15]);
    return {
      transform: [{ translateY: bounce * lift }, { scale }],
      backgroundColor: interpolateColor(
        growth.value,
        [0, 1],
        [isDark ? '#14532D' : '#86EFAC', isDark ? '#22C55E' : '#16A34A'],
      ),
    };
  });

  const leftLeafStyle = useAnimatedStyle(() => {
    const rotate = interpolate(growth.value, [0, 1], [-8, -26]);
    const scale = interpolate(growth.value, [0, 1], [0.62, 1.05]);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const rightLeafStyle = useAnimatedStyle(() => {
    const rotate = interpolate(growth.value, [0, 1], [8, 26]);
    const scale = interpolate(growth.value, [0, 1], [0.62, 1.05]);
    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  const auraStyle = useAnimatedStyle(() => {
    const alpha = interpolate(growth.value, [0, 1], [0.16, 0.46]);
    const pulse = interpolate(bob.value, [0, 1], [0, 0.12]);
    const sizeScale = interpolate(growth.value, [0, 1], [0.78, 1.12]);
    return {
      opacity: Math.min(0.65, alpha + pulse),
      transform: [{ scale: sizeScale }],
    };
  });

  return (
    <View style={styles.beanWrap}>
      <Animated.View style={[styles.beanAura, auraStyle]} />

      <Animated.View style={[styles.beanLeaf, styles.beanLeafLeft, leftLeafStyle]} />
      <Animated.View style={[styles.beanLeaf, styles.beanLeafRight, rightLeafStyle]} />

      <Animated.View style={[styles.beanBody, bodyStyle]}>
        <View style={styles.beanFace}>
          <View style={styles.beanEye} />
          <View style={styles.beanEye} />
        </View>
        <View style={styles.beanMouth} />
      </Animated.View>

      <Text style={[styles.beanStageText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
        {stageLabel(growthStage)} {Math.round(growthScore * 100)}%
      </Text>
    </View>
  );
}

function ElementFountainCard({
  element,
  isDark,
  isWide,
}: {
  element: ElementFountainState;
  isDark: boolean;
  isWide: boolean;
}) {
  const fill = useSharedValue(element.clampedRatio);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(element.clampedRatio, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [element.clampedRatio, fill]);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [shimmer]);

  const liquidStyle = useAnimatedStyle(() => {
    const height = interpolate(fill.value, [0, 1], [8, 74]);
    return { height };
  });

  const glowStyle = useAnimatedStyle(() => {
    const pulse = interpolate(shimmer.value, [0, 1], [0.15, 0.52]);
    return {
      opacity: pulse * Math.max(0.25, element.glowLevel),
    };
  });

  const stateText = element.ratio > 1 ? '満ちすぎ' : element.ratio < 0.6 ? '潤い不足' : '安定';
  const nutrientsText = element.contributors.map((item) => item.nameJa).join('・');

  return (
    <View style={[styles.fountainCard, isWide && styles.fountainCardWide]}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(15,23,42,0.85)', 'rgba(30,41,59,0.95)']
            : ['rgba(255,255,255,0.90)', 'rgba(240,249,255,0.96)']
        }
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.fountainHead}>
        <Text style={[styles.fountainLabel, { color: isDark ? '#E9E5D8' : '#0F172A' }]}>
          {element.icon} {element.labelJa}
        </Text>
        <Text style={[styles.fountainPct, { color: isDark ? '#E9E5D8' : '#0F172A' }]}>
          {Math.round(element.clampedRatio * 100)}%
        </Text>
      </View>

      <View style={styles.bowlShell}>
        <Animated.View style={[styles.bowlGlow, { backgroundColor: element.color }, glowStyle]} />
        <View style={[styles.bowlBase, { backgroundColor: isDark ? '#0F172A' : '#E9E5D8' }]}>
          <Animated.View style={[styles.bowlLiquid, { backgroundColor: element.color }, liquidStyle]} />
        </View>
      </View>

      <Text style={[styles.fountainStateText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
        {stateText}
      </Text>
      <Text style={[styles.fountainNutrients, { color: isDark ? '#8D9993' : '#475569' }]} numberOfLines={2}>
        {nutrientsText}
      </Text>
    </View>
  );
}

export default function NutritionBalanceModal() {
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const router = useRouter();
  const { mealId, date } = useLocalSearchParams<{ mealId?: string; date?: string }>();
  const [scopeTab, setScopeTab] = useState<ScopeTab>(mealId ? 'meal' : 'daily');

  const balanceData = useNutrientBalance({
    date: date ?? getToday(),
    mealId: scopeTab === 'meal' ? mealId : undefined,
  });

  const garden = useMemo(
    () => (balanceData ? buildGardenBalance(balanceData.nutrients) : null),
    [balanceData],
  );
  const nutrientSet = useMemo(
    () => (balanceData ? orderGardenNutrients(balanceData.nutrients) : []),
    [balanceData],
  );
  const currentStageIndex = Math.max(
    0,
    ALBUM_STAGES.findIndex((stage) => stage.key === garden?.growthStage),
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={isDark ? ['#052e2b', '#0f172a', '#111827'] : ['#ecfdf5', '#dcfce7', '#e0f2fe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.bgOrb, styles.bgOrbTop, { backgroundColor: isDark ? '#28A86B22' : '#22C55E30' }]} />
      <View style={[styles.bgOrb, styles.bgOrbBottom, { backgroundColor: isDark ? '#0EA5E922' : '#38BDF830' }]} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabRow}>
          {([
            { key: 'daily' as ScopeTab, label: '1日の泉' },
            { key: 'meal' as ScopeTab, label: 'この食事の泉' },
          ]).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setScopeTab(tab.key)}
              style={({ pressed: p }) => [
                styles.tab,
                {
                  backgroundColor: scopeTab === tab.key
                    ? palette.primary
                    : isDark
                      ? 'rgba(15,23,42,0.55)'
                      : 'rgba(255,255,255,0.7)',
                },
                pressed(p),
              ]}
              disabled={tab.key === 'meal' && !mealId}
              accessibilityRole="tab"
              accessibilityState={{ selected: scopeTab === tab.key }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: scopeTab === tab.key ? palette.white : c.textSecondary,
                    opacity: tab.key === 'meal' && !mealId ? 0.4 : 1,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {!balanceData || balanceData.nutrients.length === 0 || !garden ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#0F172ACC' : '#FFFFFFD9' }]}>
            <Text style={styles.emptyIcon}>●</Text>
            <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center' }]}>
              食事を記録すると、泉が満ちて豆が育ちはじめます
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.heroCard, { backgroundColor: isDark ? '#0F172ACC' : '#FFFFFFD9' }]}>
              <View style={styles.heroTextBlock}>
                <Text style={[styles.heroTitle, { color: c.text }]}>Life Garden</Text>
                <Text style={[styles.heroSubtitle, { color: c.textSecondary }]}>
                  数字ではなく、5つの泉で今日のバランスを直感で確認
                </Text>
              </View>
              <GrowingBean
                growthScore={garden.growthScore}
                growthStage={garden.growthStage}
                isDark={isDark}
              />
            </View>

            <View style={styles.fountainGrid}>
              {garden.elements.map((element, idx) => (
                <ElementFountainCard
                  key={element.key}
                  element={element}
                  isDark={isDark}
                  isWide={garden.elements.length % 2 === 1 && idx === garden.elements.length - 1}
                />
              ))}
            </View>

            {garden.hasEstimated && (
              <View style={[styles.estimatedBanner, { backgroundColor: isDark ? '#082f49AA' : '#EFF6FFEE' }]}>
                <Text style={[typography.caption1, { color: isDark ? '#BAE6FD' : '#1D4ED8' }]}>
                  一部の栄養素は推定値です（食品DB未紐付け食材を含む）
                </Text>
              </View>
            )}

            <View style={[styles.albumCard, { backgroundColor: isDark ? '#0F172ACC' : '#FFFFFFD9' }]}>
              <Text style={[styles.albumTitle, { color: c.text }]}>豆の成長アルバム</Text>
              <Text style={[styles.albumSubtitle, { color: c.textSecondary }]}>
                記録を続けるほど、豆は段階的に元気になります
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.albumRow}
              >
                {ALBUM_STAGES.map((stage, idx) => {
                  const reached = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <View
                      key={stage.key}
                      style={[
                        styles.albumItem,
                        {
                          backgroundColor: reached
                            ? isDark
                              ? '#14532D'
                              : '#DDF3E6'
                            : isDark
                              ? '#1E293B'
                              : '#F1F5F9',
                          borderColor: isCurrent ? palette.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.albumIcon, { opacity: reached ? 1 : 0.45 }]}>
                        {stage.icon}
                      </Text>
                      <Text style={[styles.albumItemTitle, { color: c.text }]}>{stage.title}</Text>
                      <Text style={[styles.albumItemSubtitle, { color: c.textSecondary }]}>
                        {stage.subtitle}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.nutrientSetCard, { backgroundColor: isDark ? '#0F172ACC' : '#FFFFFFD9' }]}>
              <Text style={[styles.nutrientSetTitle, { color: c.text }]}>使用栄養セット（{nutrientSet.length}）</Text>
              <View style={styles.nutrientChipWrap}>
                {nutrientSet.map((nutrient) => (
                  <View key={nutrient.key} style={[styles.nutrientChip, { borderColor: `${nutrient.color}55` }]}>
                    <Text style={[styles.nutrientChipText, { color: nutrient.color }]}>
                      {nutrient.nameJa}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => {
                router.dismiss();
                router.push('/(tabs)/insights');
              }}
              style={({ pressed: p }) => [
                styles.insightsButton,
                { borderColor: palette.primary, backgroundColor: isDark ? '#052e2b99' : '#FFFFFFD0' },
                pressed(p),
              ]}
              accessibilityRole="button"
              accessibilityLabel="分析タブへ移動"
            >
              <Text style={[typography.bodyBold, { color: palette.primary }]}>
                分析タブで推移を見る →
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  bgOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
  },
  bgOrbTop: {
    top: -60,
    right: -50,
  },
  bgOrbBottom: {
    bottom: 80,
    left: -70,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  tabText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: radius.xl,
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.md,
  },
  emptyIcon: {
    fontSize: 28,
    color: palette.primary,
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.md,
  },
  heroTextBlock: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.title1,
  },
  heroSubtitle: {
    ...typography.body,
  },
  beanWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 170,
  },
  beanAura: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 80,
    backgroundColor: '#4ADE80',
  },
  beanLeaf: {
    position: 'absolute',
    top: 36,
    width: 22,
    height: 38,
    borderRadius: 16,
    backgroundColor: '#22C55E',
  },
  beanLeafLeft: {
    left: '38%',
  },
  beanLeafRight: {
    right: '38%',
  },
  beanBody: {
    width: 96,
    height: 118,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#16653444',
  },
  beanFace: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  beanEye: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#052E16',
  },
  beanMouth: {
    marginTop: 8,
    width: 16,
    height: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 0,
    borderWidth: 2,
    borderColor: '#052E16',
  },
  beanStageText: {
    marginTop: spacing.md,
    ...typography.caption1,
    fontWeight: '700',
  },
  fountainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fountainCard: {
    width: '48%',
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF22',
    ...shadow.sm,
  },
  fountainCardWide: {
    width: '100%',
  },
  fountainHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fountainLabel: {
    ...typography.caption1,
    fontWeight: '700',
  },
  fountainPct: {
    ...typography.caption1,
    fontWeight: '700',
  },
  bowlShell: {
    height: 84,
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  bowlGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    height: 52,
    borderRadius: radius.full,
  },
  bowlBase: {
    height: 78,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bowlLiquid: {
    width: '100%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    opacity: 0.9,
  },
  fountainStateText: {
    ...typography.caption2,
    fontWeight: '700',
    marginBottom: 2,
  },
  fountainNutrients: {
    ...typography.caption2,
  },
  estimatedBanner: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  albumCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  albumTitle: {
    ...typography.title3,
    marginBottom: 2,
  },
  albumSubtitle: {
    ...typography.caption1,
    marginBottom: spacing.md,
  },
  albumRow: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  albumItem: {
    width: 110,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  albumIcon: {
    fontSize: 20,
    marginBottom: 4,
    color: palette.primaryDark,
  },
  albumItemTitle: {
    ...typography.caption1,
    fontWeight: '700',
  },
  albumItemSubtitle: {
    ...typography.caption2,
  },
  nutrientSetCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  nutrientSetTitle: {
    ...typography.title3,
    marginBottom: spacing.sm,
  },
  nutrientChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nutrientChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFFAA',
  },
  nutrientChipText: {
    ...typography.caption2,
    fontWeight: '700',
  },
  insightsButton: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.sm,
  },
});
