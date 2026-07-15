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
import { DISEASE_TYPES, DISEASE_LABELS, type DiseaseType } from '@/src/lib/constants';
import {
  palette, typography, spacing,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

export default function EditDiseasesModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: diseaseProfiles = [] } = useDiseaseProfiles();
  const updateDiseases = useUpdateDiseaseProfiles();

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
      <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing.xl }]}>
        該当するものを選択してください（複数選択可）
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
