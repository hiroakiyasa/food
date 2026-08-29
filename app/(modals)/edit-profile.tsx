import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile, useUpdateProfile } from '@/src/hooks/useProfile';
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  type ActivityLevel,
} from '@/src/lib/constants';
import {
  palette, typography, spacing, radius,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

export default function EditProfileModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setHeightCm(profile.height_cm?.toString() ?? '');
      setWeightKg(profile.weight_kg?.toString() ?? '');
      setActivityLevel((profile.activity_level as ActivityLevel) ?? 'moderate');
    }
  }, [profile]);

  const handleSave = async () => {
    const height = heightCm ? Number(heightCm) : null;
    const weight = weightKg ? Number(weightKg) : null;
    if (height != null && (Number.isNaN(height) || height < 80 || height > 250)) {
      Alert.alert('入力エラー', '身長は80〜250cmの範囲で入力してください');
      return;
    }
    if (weight != null && (Number.isNaN(weight) || weight < 20 || weight > 300)) {
      Alert.alert('入力エラー', '体重は20〜300kgの範囲で入力してください');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_name: displayName || null,
        height_cm: height,
        weight_kg: weight,
        activity_level: activityLevel,
      });
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.fieldLabel, { color: c.text }]}>表示名</Text>
      <TextInput
        style={[
          commonStyles.input,
          {
            backgroundColor: c.surface,
            color: c.text,
            borderColor: c.border,
          },
        ]}
        placeholder="ニックネーム"
        placeholderTextColor={c.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        accessibilityLabel="表示名"
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>身長 (cm)</Text>
          <TextInput
            style={[
              commonStyles.input,
              {
                backgroundColor: c.surface,
                color: c.text,
                borderColor: c.border,
              },
            ]}
            placeholder="170"
            placeholderTextColor={c.textMuted}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            accessibilityLabel="身長"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>体重 (kg)</Text>
          <TextInput
            style={[
              commonStyles.input,
              {
                backgroundColor: c.surface,
                color: c.text,
                borderColor: c.border,
              },
            ]}
            placeholder="65"
            placeholderTextColor={c.textMuted}
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            accessibilityLabel="体重"
          />
        </View>
      </View>

      <Text style={[styles.fieldLabel, { color: c.text }]}>活動レベル</Text>
      <View style={styles.chipContainer}>
        {ACTIVITY_LEVELS.map((level) => (
          <Pressable
            key={level}
            onPress={() => setActivityLevel(level)}
            style={({ pressed: p }) => [
              commonStyles.chip,
              activityLevel === level && commonStyles.chipActive,
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityLabel={ACTIVITY_LEVEL_LABELS[level]}
            accessibilityState={{ selected: activityLevel === level }}
          >
            <Text
              style={[
                commonStyles.chipText,
                activityLevel === level && commonStyles.chipTextActive,
              ]}
            >
              {ACTIVITY_LEVEL_LABELS[level]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={updateProfile.isPending}
        style={({ pressed: p }) => [
          commonStyles.buttonPrimary,
          { marginTop: spacing['3xl'] },
          updateProfile.isPending && { opacity: 0.6 },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel={updateProfile.isPending ? '保存中' : '保存する'}
      >
        <Text style={commonStyles.buttonText}>
          {updateProfile.isPending ? '保存中...' : '保存する'}
        </Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fieldLabel: {
    ...typography.caption1,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  halfField: { flex: 1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
