import { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useCycleStore } from '@/src/stores/cycleStore';
import { addDays, getToday } from '@/src/utils/formatters';
import {
  PHASE_INFO, calcCurrentPhase,
} from '@/src/services/cycle/cycleNutritionEngine';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

const CYCLE_LENGTH_OPTIONS = [21, 24, 26, 27, 28, 29, 30, 31, 32, 35];
const PERIOD_LENGTH_OPTIONS = [3, 4, 5, 6, 7];

// 生理開始日の選択肢（今日から何日前か）
const PERIOD_START_OPTIONS = [
  { label: '今日', daysAgo: 0 },
  { label: '昨日', daysAgo: 1 },
  { label: '2日前', daysAgo: 2 },
  { label: '3日前', daysAgo: 3 },
  { label: '4日前', daysAgo: 4 },
  { label: '5日前', daysAgo: 5 },
  { label: '7日前', daysAgo: 7 },
  { label: '10日前', daysAgo: 10 },
  { label: '14日前', daysAgo: 14 },
];

function dateFromDaysAgo(daysAgo: number): string {
  return addDays(getToday(), -daysAgo);
}

function daysAgoFromDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}

function Chip({ label, selected, onPress, isDark }: ChipProps) {
  const c = useThemeColors(isDark);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.chip,
        {
          backgroundColor: selected ? palette.primary : c.surfaceAlt,
          borderColor: selected ? palette.primary : c.border,
        },
        pressed(p),
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[
        typography.caption1,
        { color: selected ? palette.white : c.textSecondary, fontWeight: selected ? '600' : '400' },
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function CycleSetupModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);

  const {
    isEnabled,
    lastPeriodStart,
    avgCycleLength,
    avgPeriodLength,
    setEnabled,
    setLastPeriodStart,
    setAvgCycleLength,
    setAvgPeriodLength,
    recordPeriodStart,
  } = useCycleStore();

  const [localEnabled, setLocalEnabled] = useState(isEnabled);
  const [selectedDaysAgo, setSelectedDaysAgo] = useState<number | null>(
    () => daysAgoFromDate(lastPeriodStart),
  );
  const [localCycleLength, setLocalCycleLength] = useState(avgCycleLength);
  const [localPeriodLength, setLocalPeriodLength] = useState(avgPeriodLength);

  const currentPhaseInfo = (() => {
    if (!localEnabled || selectedDaysAgo == null) return null;
    const date = new Date(dateFromDaysAgo(selectedDaysAgo));
    try {
      const { phase, dayInCycle, daysUntilNext } = calcCurrentPhase(
        date, localCycleLength, localPeriodLength,
      );
      return { phase, dayInCycle, daysUntilNext, info: PHASE_INFO[phase] };
    } catch {
      return null;
    }
  })();

  const handleRecordToday = useCallback(() => {
    Alert.alert(
      '今日の生理開始を記録',
      '今日を生理開始日として記録しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '記録する',
          onPress: () => {
            setSelectedDaysAgo(0);
          },
        },
      ],
    );
  }, []);

  const handleSave = useCallback(() => {
    setEnabled(localEnabled);
    if (localEnabled && selectedDaysAgo != null) {
      setLastPeriodStart(dateFromDaysAgo(selectedDaysAgo));
    } else if (!localEnabled) {
      setLastPeriodStart(null);
    }
    setAvgCycleLength(localCycleLength);
    setAvgPeriodLength(localPeriodLength);
    router.dismiss();
  }, [
    localEnabled, selectedDaysAgo, localCycleLength, localPeriodLength,
    setEnabled, setLastPeriodStart, setAvgCycleLength, setAvgPeriodLength, router,
  ]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.title2, { color: c.text }]}>月経周期設定</Text>
        <Pressable
          onPress={() => router.dismiss()}
          style={({ pressed: p }) => [styles.closeBtn, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={[styles.closeBtnText, { color: c.textMuted }]}>×</Text>
        </Pressable>
      </View>

      {/* Enable toggle */}
      <View style={[commonStyles.card, styles.toggleCard, { backgroundColor: c.surface }, shadow.sm]}>
        <View style={styles.toggleLeft}>
          <Text style={[typography.body, { color: c.text }]}>月経周期トラッキング</Text>
          <Text style={[typography.caption1, { color: c.textMuted }]}>
            フェーズに合わせた栄養目標に調整されます
          </Text>
        </View>
        <Switch
          value={localEnabled}
          onValueChange={setLocalEnabled}
          trackColor={{ false: c.surfaceAlt, true: palette.primaryMuted }}
          thumbColor={localEnabled ? palette.primary : c.textMuted}
        />
      </View>

      {localEnabled && (
        <>
          {/* Current phase preview */}
          {currentPhaseInfo && (
            <View style={[
              styles.phasePreview,
              { backgroundColor: currentPhaseInfo.info.bgColor },
            ]}>
              <Text style={styles.phaseEmoji}>{currentPhaseInfo.info.emoji}</Text>
              <View style={styles.phaseText}>
                <Text style={[typography.bodyBold, { color: currentPhaseInfo.info.color }]}>
                  現在: {currentPhaseInfo.info.label} (Day {currentPhaseInfo.dayInCycle})
                </Text>
                <Text style={[typography.caption1, { color: currentPhaseInfo.info.color + 'CC' }]}>
                  {currentPhaseInfo.info.description}
                </Text>
                <Text style={[typography.caption2, { color: currentPhaseInfo.info.color + '99' }]}>
                  次の周期まで {currentPhaseInfo.daysUntilNext} 日
                </Text>
              </View>
            </View>
          )}

          {/* Last period start */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
            最後の生理開始日
          </Text>
          <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }, shadow.sm]}>
            <View style={styles.chipGrid}>
              {PERIOD_START_OPTIONS.map((opt) => (
                <Chip
                  key={opt.daysAgo}
                  label={opt.label}
                  selected={selectedDaysAgo === opt.daysAgo}
                  onPress={() => setSelectedDaysAgo(opt.daysAgo)}
                  isDark={isDark}
                />
              ))}
            </View>
            {selectedDaysAgo != null && (
              <Text style={[typography.caption1, { color: c.textMuted, marginTop: spacing.sm }]}>
                設定日: {dateFromDaysAgo(selectedDaysAgo)}
              </Text>
            )}
            <Pressable
              onPress={handleRecordToday}
              style={({ pressed: p }) => [
                styles.recordTodayBtn,
                { borderColor: palette.error, backgroundColor: palette.error + '11' },
                pressed(p),
              ]}
            >
              <Text style={[typography.caption1, { color: palette.error, fontWeight: '600' }]}>
                今日を記録する
              </Text>
            </Pressable>
          </View>

          {/* Average cycle length */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
            平均周期長（日）
          </Text>
          <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }, shadow.sm]}>
            <View style={styles.chipGrid}>
              {CYCLE_LENGTH_OPTIONS.map((days) => (
                <Chip
                  key={days}
                  label={`${days}日`}
                  selected={localCycleLength === days}
                  onPress={() => setLocalCycleLength(days)}
                  isDark={isDark}
                />
              ))}
            </View>
            <Text style={[typography.caption2, { color: c.textMuted, marginTop: spacing.xs }]}>
              一般的な周期は21〜35日。平均は28日です。
            </Text>
          </View>

          {/* Average period length */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
            平均生理期間（日）
          </Text>
          <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }, shadow.sm]}>
            <View style={styles.chipGrid}>
              {PERIOD_LENGTH_OPTIONS.map((days) => (
                <Chip
                  key={days}
                  label={`${days}日`}
                  selected={localPeriodLength === days}
                  onPress={() => setLocalPeriodLength(days)}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>

          {/* Phase overview */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>フェーズ別特徴</Text>
          <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }, shadow.sm]}>
            {Object.values(PHASE_INFO).map((info, i, arr) => (
              <View
                key={info.phase}
                style={[
                  styles.phaseRow,
                  i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
                ]}
              >
                <View style={[styles.phaseColorDot, { backgroundColor: info.color }]} />
                <View style={styles.phaseRowText}>
                  <Text style={[typography.caption1, { color: c.text, fontWeight: '600' }]}>
                    {info.emoji} {info.label}
                  </Text>
                  <Text style={[typography.caption2, { color: c.textMuted }]}>
                    {info.dayRange} · {info.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        style={({ pressed: p }) => [
          styles.saveBtn,
          { backgroundColor: palette.primary },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel="保存する"
      >
        <Text style={[typography.bodyBold, { color: palette.white }]}>保存する</Text>
      </Pressable>
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
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  toggleLeft: { flex: 1, gap: 4 },
  phasePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  phaseEmoji: { fontSize: 28, lineHeight: 34 },
  phaseText: { flex: 1, gap: 2 },
  sectionLabel: {
    ...typography.caption1,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  recordTodayBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  phaseColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  phaseRowText: { flex: 1, gap: 2 },
  saveBtn: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
