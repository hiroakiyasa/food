import { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useNutritionTargets, useUpdateNutritionTargets } from '@/src/hooks/useNutritionTargets';
import { recalculateTargets } from '@/src/services/nutrition/targets';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

interface TargetField {
  key: string;
  label: string;
  unit: string;
}

const FIELDS: TargetField[] = [
  { key: 'energy_kcal', label: 'カロリー目標', unit: 'kcal' },
  { key: 'protein_g', label: 'たんぱく質', unit: 'g' },
  { key: 'fat_g', label: '脂質', unit: 'g' },
  { key: 'carbohydrate_g', label: '炭水化物', unit: 'g' },
  { key: 'fiber_g', label: '食物繊維', unit: 'g' },
  { key: 'salt_g', label: '塩分', unit: 'g' },
];

type TargetValues = Record<string, string>;

function InputRow({
  label,
  unit,
  value,
  onChange,
  isDark,
  isLast,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  isLast?: boolean;
}) {
  const c = useThemeColors(isDark);
  return (
    <View style={[styles.inputRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider }]}>
      <Text style={[typography.body, { color: c.text, flex: 1 }]}>{label}</Text>
      <View style={[styles.inputWrapper, { borderColor: c.border }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          style={[typography.body, { color: c.text, minWidth: 60, textAlign: 'right' }]}
          accessibilityLabel={label}
        />
        <Text style={[typography.caption1, { color: c.textMuted }]}>{unit}</Text>
      </View>
    </View>
  );
}

export default function EditNutritionTargetsModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: currentTargets } = useNutritionTargets();
  const updateTargets = useUpdateNutritionTargets();

  const [values, setValues] = useState<TargetValues>({});
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (currentTargets) {
      setValues({
        energy_kcal: String(currentTargets.energy_kcal ?? 2000),
        protein_g: String(currentTargets.protein_g ?? 60),
        fat_g: String(currentTargets.fat_g ?? 55),
        carbohydrate_g: String(currentTargets.carbohydrate_g ?? 270),
        fiber_g: String(currentTargets.fiber_g ?? 21),
        salt_g: String(currentTargets.salt_g ?? 7.5),
      });
    } else {
      setValues({
        energy_kcal: '2000',
        protein_g: '60',
        fat_g: '55',
        carbohydrate_g: '270',
        fiber_g: '21',
        salt_g: '7.5',
      });
    }
  }, [currentTargets]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const newTargets = await recalculateTargets();
      setValues({
        energy_kcal: String(newTargets.energy_kcal),
        protein_g: String(newTargets.protein_g),
        fat_g: String(newTargets.fat_g),
        carbohydrate_g: String(newTargets.carbohydrate_g),
        fiber_g: String(newTargets.fiber_g),
        salt_g: String(newTargets.salt_g),
      });
    } catch (err) {
      Alert.alert('再計算エラー', (err as Error).message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = async () => {
    const parsed = {
      energy_kcal: parseFloat(values.energy_kcal ?? '0'),
      protein_g: parseFloat(values.protein_g ?? '0'),
      fat_g: parseFloat(values.fat_g ?? '0'),
      carbohydrate_g: parseFloat(values.carbohydrate_g ?? '0'),
      fiber_g: parseFloat(values.fiber_g ?? '0'),
      sodium_mg: parseFloat(values.salt_g ?? '0') / 2.54 * 1000,
      salt_g: parseFloat(values.salt_g ?? '0'),
      cholesterol_mg: null,
      potassium_mg: null,
      calcium_mg: null,
      iron_mg: null,
      calculation_basis: null,
    };

    const hasInvalid = Object.values(parsed).some((v) => v !== null && isNaN(v));
    if (hasInvalid) {
      Alert.alert('入力エラー', '数値を正しく入力してください');
      return;
    }

    // Safety ranges: reject targets that are dangerous or clearly typos.
    const ranges: Array<[keyof typeof parsed, number, number, string]> = [
      ['energy_kcal', 1000, 6000, 'カロリーは1000〜6000kcalの範囲で設定してください。1000kcalを下回る目標は健康を損なうおそれがあります'],
      ['protein_g', 10, 400, 'タンパク質は10〜400gの範囲で入力してください'],
      ['fat_g', 10, 300, '脂質は10〜300gの範囲で入力してください'],
      ['carbohydrate_g', 20, 800, '炭水化物は20〜800gの範囲で入力してください'],
      ['fiber_g', 0, 100, '食物繊維は0〜100gの範囲で入力してください'],
      ['salt_g', 1, 30, '塩分は1〜30gの範囲で入力してください'],
    ];
    for (const [key, min, max, message] of ranges) {
      const value = parsed[key];
      if (value != null && (value < min || value > max)) {
        Alert.alert('入力エラー', message);
        return;
      }
    }

    try {
      await updateTargets.mutateAsync(parsed);
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* AI recalculate button */}
        <Pressable
          onPress={handleRecalculate}
          disabled={recalculating}
          style={({ pressed: p }) => [
            styles.recalcButton,
            { backgroundColor: c.surface },
            shadow.sm,
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel="AIで目標を再計算"
        >
          {recalculating ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <Text style={styles.recalcEmoji}>🤖</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: c.text }]}>AIで再計算</Text>
            <Text style={[typography.caption1, { color: c.textMuted }]}>
              プロフィールから最適な目標を自動計算
            </Text>
          </View>
          <Text style={[{ color: c.textMuted, fontSize: 16 }]}>›</Text>
        </Pressable>

        {/* Manual input */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>手動で設定</Text>
        <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }, shadow.sm]}>
          {FIELDS.map((field, idx) => (
            <InputRow
              key={field.key}
              label={field.label}
              unit={field.unit}
              value={values[field.key] ?? ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
              isDark={isDark}
              isLast={idx === FIELDS.length - 1}
            />
          ))}
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={updateTargets.isPending}
          style={({ pressed: p }) => [commonStyles.buttonPrimary, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="保存する"
        >
          {updateTargets.isPending ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={commonStyles.buttonText}>保存する</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { ...commonStyles.sectionHeader },
  recalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  recalcEmoji: { fontSize: 28 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
    gap: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
