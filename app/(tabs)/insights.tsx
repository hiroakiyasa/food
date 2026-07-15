import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useUIStore } from '@/src/stores/uiStore';
import { useInsightsData } from '@/src/hooks/useInsightsData';
import { useNutritionTargets } from '@/src/hooks/useNutritionTargets';
import { useBadges } from '@/src/hooks/useBadges';
import { useSleepNutritionCorrelation } from '@/src/hooks/useSleepNutritionCorrelation';
import { useCarbonFootprint } from '@/src/hooks/useCarbonFootprint';
import { WeeklyNutrientRadar } from '@/src/components/insights/WeeklyNutrientRadar';
import { NutrientTrendMini } from '@/src/components/insights/NutrientTrendMini';
import { AchievementShowcase } from '@/src/components/insights/AchievementShowcase';
import { SleepInsightCard } from '@/src/components/insights/SleepInsightCard';
import { CarbonFootprintCard } from '@/src/components/insights/CarbonFootprintCard';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatDate } from '@/src/utils/formatters';
import {
  palette, typography, spacing, radius,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

type Period = '1W' | '1M' | '3M';
const PERIODS: { key: Period; label: string }[] = [
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
];

export default function InsightsScreen() {
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { insightsPeriod, setInsightsPeriod } = useUIStore();
  const { data: insightsData } = useInsightsData(insightsPeriod);
  const { data: nutritionTargets } = useNutritionTargets();
  const { data: badges = [] } = useBadges();
  const { data: sleepAnalysis } = useSleepNutritionCorrelation(14);

  const summaries = insightsData?.dailySummaries ?? [];
  const carbonAnalysis = useCarbonFootprint(summaries);
  const healthData = insightsData?.healthData ?? [];

  const calorieData = summaries.map((s) => ({
    value: s.total_energy_kcal ?? 0,
    label: formatDate(s.date),
  }));

  const pfcData = summaries.map((s) => ({
    stacks: [
      { value: s.total_protein_g ?? 0, color: palette.protein },
      { value: s.total_fat_g ?? 0, color: palette.fat, marginBottom: 0 },
      { value: s.total_carbohydrate_g ?? 0, color: palette.carbs, marginBottom: 0 },
    ],
    label: formatDate(s.date),
  }));

  const scoreData = summaries
    .filter((s) => s.daily_score != null)
    .map((s) => ({
      value: s.daily_score ?? 0,
      label: formatDate(s.date),
    }));

  const weightData = healthData
    .filter((h) => h.weight_kg != null)
    .map((h) => ({
      value: h.weight_kg ?? 0,
      label: formatDate(h.date),
    }));

  const hasData = summaries.length > 0;
  const chartLabelStyle = { fontSize: 9, color: c.textMuted };
  const rulesColor = isDark ? '#334155' : '#E9E5D8';

  const proteinTarget = nutritionTargets?.protein_g ?? 60;
  const fatTarget = nutritionTargets?.fat_g ?? 55;
  const carbsTarget = nutritionTargets?.carbohydrate_g ?? 300;
  const fiberTarget = nutritionTargets?.fiber_g ?? 20;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setInsightsPeriod(p.key)}
            style={({ pressed: pr }) => [
              styles.periodButton,
              { backgroundColor: insightsPeriod === p.key ? palette.primary : c.surfaceAlt },
              pressed(pr),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`期間: ${p.label}`}
            accessibilityState={{ selected: insightsPeriod === p.key }}
          >
            <Text style={[
              styles.periodText,
              { color: insightsPeriod === p.key ? palette.white : c.textSecondary },
              insightsPeriod === p.key && styles.periodTextActive,
            ]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!hasData ? (
        <View style={[commonStyles.card, styles.emptyCard, { backgroundColor: c.surface }]}>
          <View style={styles.emptyIcon}>
            <FontAwesome name="bar-chart" size={28} color={palette.sky} />
          </View>
          <Text style={[typography.title2, { color: c.text, textAlign: 'center' }]}>
            あなたの変化を育てよう
          </Text>
          <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center' }]}>
            食事を記録すると、栄養バランスやスコアの変化を楽しく振り返れます
          </Text>
        </View>
      ) : (
        <>
          {/* Calorie Trend */}
          <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.chartTitle, { color: c.textSecondary }]}>CALORIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={calorieData}
                width={Math.max(280, calorieData.length * 50)}
                height={140}
                color={palette.primary}
                dataPointsColor={palette.primary}
                startFillColor={palette.primary}
                endFillColor="transparent"
                startOpacity={0.2}
                endOpacity={0}
                areaChart
                curved
                thickness={2}
                xAxisLabelTextStyle={chartLabelStyle}
                yAxisTextStyle={chartLabelStyle}
                hideRules={false}
                rulesColor={rulesColor}
                noOfSections={4}
              />
            </ScrollView>
          </View>

          {/* Weekly Nutrient Radar */}
          <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.chartTitle, { color: c.textSecondary }]}>
              NUTRIENT RADAR
            </Text>
            <WeeklyNutrientRadar
              summaries={summaries}
              proteinTarget={proteinTarget}
              fatTarget={fatTarget}
              carbsTarget={carbsTarget}
              fiberTarget={fiberTarget}
              isDark={isDark}
            />
          </View>

          {/* PFC */}
          {pfcData.length > 0 && (
            <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
              <Text style={[styles.chartTitle, { color: c.textSecondary }]}>PFC BALANCE</Text>
              <View style={styles.legend}>
                {[
                  { label: 'P', color: palette.protein },
                  { label: 'F', color: palette.fat },
                  { label: 'C', color: palette.carbs },
                ].map((i) => (
                  <View key={i.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: i.color }]} />
                    <Text style={[typography.caption2, { color: c.textMuted }]}>{i.label}</Text>
                  </View>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  stackData={pfcData}
                  width={Math.max(280, pfcData.length * 50)}
                  height={140}
                  barWidth={18}
                  spacing={22}
                  xAxisLabelTextStyle={chartLabelStyle}
                  yAxisTextStyle={chartLabelStyle}
                  hideRules={false}
                  rulesColor={rulesColor}
                  noOfSections={4}
                />
              </ScrollView>
            </View>
          )}

          {/* Nutrient Trend Mini */}
          <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.chartTitle, { color: c.textSecondary }]}>
              NUTRIENT TRENDS
            </Text>
            <NutrientTrendMini summaries={summaries} isDark={isDark} />
          </View>

          {/* Score */}
          {scoreData.length > 0 && (
            <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
              <Text style={[styles.chartTitle, { color: c.textSecondary }]}>SCORE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={scoreData}
                  width={Math.max(280, scoreData.length * 50)}
                  height={140}
                  color={palette.accent}
                  dataPointsColor={palette.accent}
                  curved
                  thickness={2}
                  maxValue={100}
                  xAxisLabelTextStyle={chartLabelStyle}
                  yAxisTextStyle={chartLabelStyle}
                  hideRules={false}
                  rulesColor={rulesColor}
                  noOfSections={4}
                />
              </ScrollView>
            </View>
          )}

          {/* Weight */}
          {weightData.length > 0 && (
            <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
              <Text style={[styles.chartTitle, { color: c.textSecondary }]}>WEIGHT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={weightData}
                  width={Math.max(280, weightData.length * 50)}
                  height={140}
                  color={palette.fiber}
                  dataPointsColor={palette.fiber}
                  curved
                  thickness={2}
                  xAxisLabelTextStyle={chartLabelStyle}
                  yAxisTextStyle={chartLabelStyle}
                  hideRules={false}
                  rulesColor={rulesColor}
                  noOfSections={4}
                />
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Sleep × Nutrition */}
      {sleepAnalysis && (
        <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.chartTitle, { color: c.textSecondary }]}>SLEEP × NUTRITION</Text>
          <SleepInsightCard analysis={sleepAnalysis} isDark={isDark} />
        </View>
      )}

      {/* Carbon Footprint */}
      <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
        <Text style={[styles.chartTitle, { color: c.textSecondary }]}>CARBON FOOTPRINT</Text>
        <CarbonFootprintCard analysis={carbonAnalysis} isDark={isDark} />
      </View>

      {/* Achievement Showcase */}
      <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
        <Text style={[styles.chartTitle, { color: c.textSecondary }]}>ACHIEVEMENTS</Text>
        <AchievementShowcase badges={badges} isDark={isDark} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 56,
    alignItems: 'center',
  },
  periodText: { ...typography.caption1 },
  periodTextActive: { fontWeight: '700', color: palette.white },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentLight,
  },
  chartTitle: { ...commonStyles.sectionHeader },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
});
