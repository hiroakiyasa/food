import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import {
  palette, typography, spacing, radius, shadow, pressed,
} from '@/src/lib/theme';

interface QuickAddBarProps {
  isDark: boolean;
  mealType?: string;
}

const QUICK_ACTIONS = [
  { key: 'camera', icon: 'camera' as const, label: 'カメラ', route: '/(modals)/camera', color: palette.primary, bg: palette.primaryMuted },
  { key: 'search', icon: 'search' as const, label: '検索', route: '/(modals)/food-search', color: '#3B82F6', bg: '#3B82F615' },
  { key: 'chat', icon: 'comment' as const, label: 'AIチャット', route: '/(modals)/chat-meal', color: '#8B5CF6', bg: '#8B5CF615' },
  { key: 'barcode', icon: 'barcode' as const, label: 'バーコード', route: '/(modals)/barcode', color: '#F59E0B', bg: '#F59E0B15' },
];

function QuickAddBarComponent({ isDark, mealType }: QuickAddBarProps) {
  const router = useRouter();
  const surfaceAlt = isDark ? '#334155' : '#F1F5F9';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';

  return (
    <View style={styles.container}>
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.key}
          onPress={() => {
            const suffix = mealType ? `?mealType=${mealType}` : '';
            router.push(`${action.route}${suffix}` as never);
          }}
          style={({ pressed: p }) => [
            styles.button,
            { backgroundColor: surfaceAlt },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View style={[styles.iconCircle, { backgroundColor: action.bg }]}>
            <FontAwesome name={action.icon} size={18} color={action.color} />
          </View>
          <Text style={[styles.label, { color: textMuted }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const QuickAddBar = React.memo(QuickAddBarComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    ...shadow.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption2,
  },
});
