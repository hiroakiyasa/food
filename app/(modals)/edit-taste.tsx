import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useTastePreferences, useUpdateTastePreferences } from '@/src/hooks/useTastePreferences';
import { Alert } from 'react-native';
import {
  palette, typography, spacing, radius,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

export default function EditTasteModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: tastePrefs } = useTastePreferences();
  const updateTaste = useUpdateTastePreferences();

  const [saltPref, setSaltPref] = useState(3);
  const [sweetPref, setSweetPref] = useState(3);
  const [spicyPref, setSpicyPref] = useState(3);
  const [umamiPref, setUmamiPref] = useState(3);

  useEffect(() => {
    if (tastePrefs) {
      setSaltPref(tastePrefs.salt_preference);
      setSweetPref(tastePrefs.sweet_preference);
      setSpicyPref(tastePrefs.spicy_preference);
      setUmamiPref(tastePrefs.umami_preference);
    }
  }, [tastePrefs]);

  const handleSave = async () => {
    try {
      await updateTaste.mutateAsync({
        salt_preference: saltPref,
        sweet_preference: sweetPref,
        spicy_preference: spicyPref,
        umami_preference: umamiPref,
      });
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  const prefs = [
    { label: '塩味', value: saltPref, setter: setSaltPref },
    { label: '甘味', value: sweetPref, setter: setSweetPref },
    { label: '辛味', value: spicyPref, setter: setSpicyPref },
    { label: 'うま味', value: umamiPref, setter: setUmamiPref },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing['2xl'] }]}>
        好みの味を教えてください（1=苦手 〜 5=好き）
      </Text>

      {prefs.map(({ label, value, setter }) => (
        <View key={label} style={styles.prefRow}>
          <Text style={[typography.bodyBold, { color: c.text, width: 60 }]}>{label}</Text>
          <View style={styles.prefButtons}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setter(n)}
                style={({ pressed: p }) => [
                  styles.prefButton,
                  { borderColor: c.border, backgroundColor: c.surface },
                  value === n && styles.prefButtonActive,
                  pressed(p),
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${label} ${n}`}
                accessibilityState={{ selected: value === n }}
              >
                <Text
                  style={[
                    typography.body,
                    { color: c.textSecondary },
                    value === n && styles.prefButtonTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        onPress={handleSave}
        disabled={updateTaste.isPending}
        style={({ pressed: p }) => [
          commonStyles.buttonPrimary,
          { marginTop: spacing['2xl'] },
          updateTaste.isPending && { opacity: 0.6 },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel={updateTaste.isPending ? '保存中' : '保存する'}
      >
        <Text style={commonStyles.buttonText}>
          {updateTaste.isPending ? '保存中...' : '保存する'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  prefButtons: { flexDirection: 'row', gap: spacing.sm },
  prefButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  prefButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  prefButtonTextActive: {
    color: palette.white,
    fontWeight: '600',
  },
});
