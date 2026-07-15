import { View, Text, Pressable, StyleSheet } from 'react-native';
import { palette, typography, spacing, radius, shadow, pressed, useThemeColors } from '@/src/lib/theme';
import type { LocalSuggestion } from '@/src/lib/localDb';

type Suggestion = LocalSuggestion;

const TYPE_LABELS: Record<string, string> = {
  addition: '足し算',
  cooking_hack: '調理ハック',
  alternative: '代替',
  recovery: 'リカバリー',
};

const TYPE_COLORS: Record<string, string> = {
  addition: palette.primary,
  cooking_hack: palette.accent,
  alternative: palette.fiber,
  recovery: palette.warning,
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  onDismiss?: () => void;
  onApply?: () => void;
  isDark?: boolean;
}

export function SuggestionCard({
  suggestion,
  onDismiss,
  onApply,
  isDark = false,
}: SuggestionCardProps) {
  const c = useThemeColors(isDark);
  const color = TYPE_COLORS[suggestion.suggestion_type] ?? palette.primary;

  return (
    <View style={[styles.card, { backgroundColor: c.surface }, shadow.md]}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: color + '15' }]}>
          <View style={[styles.typeDot, { backgroundColor: color }]} />
          <Text style={[styles.typeText, { color }]}>
            {TYPE_LABELS[suggestion.suggestion_type]}
          </Text>
        </View>
      </View>
      <Text style={[typography.bodyBold, { color: c.text }]}>
        {suggestion.title}
      </Text>
      <Text style={[typography.body, { color: c.textSecondary, marginTop: 2 }]}>
        {suggestion.description}
      </Text>
      {suggestion.reasoning && (
        <Text style={[typography.caption1, { color: c.textMuted, fontStyle: 'italic', marginTop: 4 }]}>
          {suggestion.reasoning}
        </Text>
      )}
      <View style={styles.actions}>
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            style={({ pressed: p }) => [styles.dismissButton, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="スキップ"
          >
            <Text style={[typography.caption1, { color: c.textMuted }]}>スキップ</Text>
          </Pressable>
        )}
        {onApply && (
          <Pressable
            onPress={onApply}
            style={({ pressed: p }) => [styles.applyButton, { backgroundColor: color }, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="やってみる"
          >
            <Text style={[typography.caption1, { color: palette.white, fontWeight: '600' }]}>やってみる</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: { marginBottom: spacing.sm },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeText: { ...typography.caption2, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
});
