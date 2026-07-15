import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius } from '@/src/lib/theme';
import type { NutrientStatus } from '@/src/types/nutrientBalance';

const STATUS_STYLES: Record<NutrientStatus, { bg: string; text: string; label: string }> = {
  deficient: { bg: '#3B82F620', text: '#3B82F6', label: '不足' },
  adequate: { bg: '#22C55E20', text: '#22C55E', label: '適正' },
  excessive: { bg: '#EF444420', text: '#EF4444', label: '過剰' },
};

interface NutrientStatusBadgeProps {
  status: NutrientStatus;
  size?: 'sm' | 'md';
}

function NutrientStatusBadgeComponent({ status, size = 'sm' }: NutrientStatusBadgeProps) {
  const s = STATUS_STYLES[status];
  const isMd = size === 'md';

  return (
    <View style={[styles.badge, { backgroundColor: s.bg }, isMd && styles.badgeMd]}>
      <Text style={[styles.text, { color: s.text }, isMd && styles.textMd]}>
        {s.label}
      </Text>
    </View>
  );
}

export const NutrientStatusBadge = React.memo(NutrientStatusBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
  textMd: {
    fontSize: 12,
  },
});
