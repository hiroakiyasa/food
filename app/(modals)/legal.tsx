import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { LEGAL_DOCS, LEGAL_LAST_UPDATED, type LegalDocKey } from '@/src/lib/legal';
import { typography, spacing, commonStyles, useThemeColors } from '@/src/lib/theme';

export default function LegalModal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);

  const docKey: LegalDocKey = doc === 'privacy' ? 'privacy' : 'terms';
  const legalDoc = LEGAL_DOCS[docKey];

  return (
    <>
      <Stack.Screen options={{ title: legalDoc.title }} />
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator
      >
        <Text style={[typography.caption1, { color: c.textMuted, marginBottom: spacing.lg }]}>
          最終更新日: {LEGAL_LAST_UPDATED}
        </Text>
        {legalDoc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text
              style={[typography.bodyBold, { color: c.text, marginBottom: spacing.xs }]}
              accessibilityRole="header"
            >
              {section.heading}
            </Text>
            <Text style={[typography.body, styles.body, { color: c.textSecondary }]}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginBottom: spacing.lg },
  body: { lineHeight: 22 },
});
