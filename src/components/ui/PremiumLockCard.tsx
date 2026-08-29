import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import {
  palette, typography, spacing, radius, shadow, commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

interface PremiumLockCardProps {
  title: string;
  description: string;
  features?: string[];
}

// Shown in place of a premium-only screen body for free users.
export function PremiumLockCard({ title, description, features }: PremiumLockCardProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);

  return (
    <View style={[commonStyles.card, styles.card, { backgroundColor: c.surface }, shadow.md]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>P</Text>
      </View>
      <Text style={[typography.title3, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      <Text
        style={[typography.body, styles.description, { color: c.textSecondary }]}
      >
        {description}
      </Text>
      {features && features.length > 0 && (
        <View style={styles.featureList}>
          {features.map((feature) => (
            <Text key={feature} style={[typography.caption1, { color: c.textSecondary }]}>
              ✓ {feature}
            </Text>
          ))}
        </View>
      )}
      <Pressable
        onPress={() => router.push('/(modals)/premium' as never)}
        style={({ pressed: p }) => [styles.ctaButton, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel="Premiumの詳細を見る"
      >
        <Text style={commonStyles.buttonText}>Premiumの詳細を見る</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  badgeText: { color: palette.white, fontSize: 20, fontWeight: '700' },
  description: {
    textAlign: 'center',
    lineHeight: 21,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  ctaButton: {
    backgroundColor: palette.warning,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
