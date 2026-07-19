import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useDiseaseProfiles, useUpdateDiseaseProfiles } from '@/src/hooks/useDiseaseProfiles';
import { useActiveConditions } from '@/src/hooks/useActiveConditions';
import { DISEASE_TYPES, DISEASE_LABELS, type DiseaseType } from '@/src/lib/constants';
import {
  palette, typography, spacing,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

// Each disease maps onto the matching nutrition-guideline condition so that
// registering a disease actually adjusts nutrition goals (not just stores it).
const DISEASE_TO_CONDITION: Record<DiseaseType, string> = {
  hypertension: '高血圧',
  diabetes: '2型糖尿病',
  dyslipidemia: '脂質異常症 (高LDLコレステロール血症)',
  hyperuricemia: '高尿酸血症・痛風',
  kidney_disease: '慢性腎臓病 (CKD) ステージG3-5',
  liver_disease: 'NAFLD/NASH (非アルコール性脂肪性肝疾患)',
  anemia: '鉄欠乏性貧血',
};

export default function EditDiseasesModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: diseaseProfiles = [] } = useDiseaseProfiles();
  const updateDiseases = useUpdateDiseaseProfiles();
  const { activeConditions, updateActiveConditions } = useActiveConditions();

  const [selected, setSelected] = useState<DiseaseType[]>([]);

  useEffect(() => {
    setSelected(diseaseProfiles.map((d) => d.disease_type as DiseaseType));
  }, [diseaseProfiles]);

  const toggle = (d: DiseaseType) => {
    setSelected((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const handleSave = async () => {
    try {
      await updateDiseases.mutateAsync(selected);

      // Sync nutrition conditions with the disease selection: add conditions
      // for newly selected diseases, drop those for deselected ones, and keep
      // conditions the user added independently (via 栄養管理条件) untouched.
      const mappedAll = new Set(Object.values(DISEASE_TO_CONDITION));
      const mappedSelected = selected.map((d) => DISEASE_TO_CONDITION[d]);
      const nextConditions = [
        ...activeConditions.filter((cond) => !mappedAll.has(cond)),
        ...mappedSelected,
      ];
      const changed =
        nextConditions.length !== activeConditions.length ||
        nextConditions.some((cond) => !activeConditions.includes(cond));
      if (changed) {
        await updateActiveConditions(nextConditions);
      }

      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing.sm }]}>
        該当するものを選択してください（複数選択可）
      </Text>
      <Text style={[typography.caption1, { color: c.textMuted, marginBottom: spacing.xl, lineHeight: 19 }]}>
        登録は任意です。この情報は、栄養目標と食事提案をあなたに合わせて調整するためにのみ使用され、第三者に提供されることはありません。通院中の方は、主治医の指導を優先してください。
      </Text>

      <View style={styles.chipContainer}>
        {DISEASE_TYPES.map((d) => (
          <Pressable
            key={d}
            onPress={() => toggle(d)}
            style={({ pressed: p }) => [
              commonStyles.chip,
              selected.includes(d) && commonStyles.chipActive,
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel={DISEASE_LABELS[d]}
            accessibilityState={{ selected: selected.includes(d) }}
          >
            <Text
              style={[
                commonStyles.chipText,
                selected.includes(d) && commonStyles.chipTextActive,
              ]}
            >
              {DISEASE_LABELS[d]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={updateDiseases.isPending}
        style={({ pressed: p }) => [
          commonStyles.buttonPrimary,
          { marginTop: spacing['3xl'] },
          updateDiseases.isPending && { opacity: 0.6 },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel={updateDiseases.isPending ? '保存中' : '保存する'}
      >
        <Text style={commonStyles.buttonText}>
          {updateDiseases.isPending ? '保存中...' : '保存する'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
