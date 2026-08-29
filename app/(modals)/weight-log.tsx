import { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, Pressable, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile } from '@/src/hooks/useProfile';
import { useHealthDataRange, useLogWeight } from '@/src/hooks/useHealthData';
import { addDays, getToday, formatDateFull } from '@/src/utils/formatters';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

const QUICK_ADJUSTMENTS = [-0.5, -0.1, +0.1, +0.5];

export default function WeightLogModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: profile } = useProfile();
  const today = getToday();
  const { data: recentData = [] } = useHealthDataRange(addDays(today, -14), today);
  const logWeight = useLogWeight();

  const [weightText, setWeightText] = useState('');

  // Prefill with the most recent known weight.
  useEffect(() => {
    if (weightText !== '') return;
    const latestLogged = [...recentData].reverse().find((d) => d.weight_kg != null);
    const initial = latestLogged?.weight_kg ?? profile?.weight_kg;
    if (initial != null) {
      setWeightText(String(initial));
    }
  }, [recentData, profile]);

  const adjust = (delta: number) => {
    const current = Number(weightText);
    if (Number.isNaN(current)) return;
    setWeightText((Math.round((current + delta) * 10) / 10).toFixed(1));
  };

  const handleSave = async () => {
    const weight = Number(weightText);
    if (Number.isNaN(weight) || weight < 20 || weight > 300) {
      Alert.alert('入力エラー', '体重は20〜300kgの範囲で入力してください');
      return;
    }
    try {
      await logWeight.mutateAsync({ date: today, weightKg: weight });
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  const weightHistory = recentData.filter((d) => d.weight_kg != null).slice(-7).reverse();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={commonStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.caption1, { color: c.textMuted, marginBottom: spacing.sm }]}>
          {formatDateFull(today)}
        </Text>

        <View style={[commonStyles.card, styles.inputCard, { backgroundColor: c.surface }, shadow.md]}>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.weightInput, { color: c.text }]}
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="decimal-pad"
              placeholder="60.0"
              placeholderTextColor={c.textMuted}
              maxLength={5}
              accessibilityLabel="今日の体重"
            />
            <Text style={[typography.title3, { color: c.textSecondary }]}>kg</Text>
          </View>
          <View style={styles.adjustRow}>
            {QUICK_ADJUSTMENTS.map((delta) => (
              <Pressable
                key={delta}
                onPress={() => adjust(delta)}
                style={({ pressed: p }) => [
                  styles.adjustChip,
                  { backgroundColor: c.surfaceAlt, borderColor: c.border },
                  pressed(p),
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${delta > 0 ? 'プラス' : 'マイナス'}${Math.abs(delta)}キログラム`}
              >
                <Text style={[typography.bodyBold, { color: c.textSecondary }]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={logWeight.isPending}
          style={({ pressed: p }) => [
            commonStyles.buttonPrimary,
            { marginTop: spacing.xl },
            logWeight.isPending && { opacity: 0.6 },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel="体重を記録する"
        >
          {logWeight.isPending ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={commonStyles.buttonText}>記録する</Text>
          )}
        </Pressable>

        {weightHistory.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>最近の記録</Text>
            <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
              {weightHistory.map((entry, index) => (
                <View
                  key={entry.date}
                  style={[
                    styles.historyRow,
                    index < weightHistory.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: c.divider,
                    },
                  ]}
                >
                  <Text style={[typography.body, { color: c.textSecondary }]}>
                    {formatDateFull(entry.date)}
                  </Text>
                  <Text style={[typography.bodyBold, { color: c.text }]}>
                    {entry.weight_kg?.toFixed(1)} kg
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[typography.caption2, { color: c.textMuted, textAlign: 'center', marginTop: spacing.lg }]}>
          毎日同じタイミング（起床後など）に量ると変化がわかりやすくなります。
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  weightInput: {
    fontSize: 56,
    fontWeight: '800',
    minWidth: 160,
    textAlign: 'center',
    padding: 0,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  adjustChip: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...commonStyles.sectionHeader,
    marginTop: spacing.xl,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
});
