import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radius } from '@/src/lib/theme';

export type TokuhoCategory = 'tokuho' | 'functional_claim';

interface TokuhoChipProps {
  category: TokuhoCategory;
  /** true の場合テキストのみ（コンパクト表示） */
  compact?: boolean;
}

const CONFIG: Record<TokuhoCategory, { label: string; color: string; bg: string; border: string }> = {
  tokuho: {
    label: '特保',
    color: '#0369A1',  // sky-700
    bg: '#E0F2FE',     // sky-100
    border: '#7DD3FC', // sky-300
  },
  functional_claim: {
    label: '機能性',
    color: '#047857',  // emerald-700
    bg: '#D1FAE5',     // emerald-100
    border: '#6EE7B7', // emerald-300
  },
};

export const TokuhoChip = memo(function TokuhoChip({ category, compact }: TokuhoChipProps) {
  const cfg = CONFIG[category];
  return (
    <View style={[
      styles.chip,
      compact && styles.compact,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
    ]}>
      <Text style={[styles.label, { color: cfg.color }]}>✓ {cfg.label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  compact: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  label: {
    ...typography.caption2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
