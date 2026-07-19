import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, pressed, radius, shadow, spacing, typography } from '@/src/lib/theme';

interface QuickAddBarProps {
  isDark: boolean;
  mealType?: string;
  /** Calendar day (YYYY-MM-DD) the recording flows should target. */
  date?: string;
}

const QUICK_ACTIONS = [
  {
    key: 'barcode',
    icon: 'barcode' as const,
    label: 'バーコード',
    hint: '商品をスキャン',
    route: '/(modals)/barcode',
    color: '#9A6A12',
    soft: '#FFF3D7',
  },
  {
    key: 'camera',
    icon: 'camera' as const,
    label: '写真',
    hint: '撮って記録',
    route: '/(modals)/camera',
    color: palette.primary,
    soft: palette.primaryLight,
  },
  {
    key: 'search',
    icon: 'search' as const,
    label: '検索',
    hint: '食品から選ぶ',
    route: '/(modals)/food-search',
    color: palette.apricot,
    soft: '#FFF0E8',
  },
  {
    key: 'chat',
    icon: 'commenting' as const,
    label: 'AIに話す',
    hint: '言葉でかんたん',
    route: '/(modals)/chat-meal',
    color: '#278DC8',
    soft: palette.accentLight,
  },
];

function QuickAddBarComponent({ isDark, mealType, date }: QuickAddBarProps) {
  const router = useRouter();
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const text = isDark ? '#F1F5F9' : palette.ink;
  const muted = isDark ? '#8D9993' : '#66766F';

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      {QUICK_ACTIONS.map((action, index) => (
        <React.Fragment key={action.key}>
          {index > 0 && <View style={styles.divider} />}
          <Pressable
            onPress={() => {
              const params = [
                mealType ? `mealType=${mealType}` : null,
                date ? `date=${date}` : null,
              ].filter(Boolean);
              const query = params.length > 0 ? `?${params.join('&')}` : '';
              router.push(`${action.route}${query}` as never);
            }}
            style={({ pressed: isPressed }) => [styles.button, pressed(isPressed)]}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}で食事を記録`}
            accessibilityHint={action.hint}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.soft }]}>
              <FontAwesome name={action.icon} size={23} color={action.color} />
            </View>
            <Text style={[styles.label, { color: action.color }]}>{action.label}</Text>
            <Text style={[styles.hint, { color: muted }]} numberOfLines={1}>{action.hint}</Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

export const QuickAddBar = React.memo(QuickAddBarComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadow.md,
  },
  button: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
    backgroundColor: '#E9E5D8',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    ...typography.bodyBold,
    lineHeight: 20,
  },
  hint: {
    fontSize: 10,
    fontWeight: '500',
  },
});
