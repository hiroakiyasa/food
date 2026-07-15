import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, typography, spacing } from '@/src/lib/theme';

interface HeroPFCMiniProps {
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  proteinTarget: number;
  fatTarget: number;
  carbsTarget: number;
  fiberTarget: number;
}

interface MacroRowProps {
  label: string;
  value: number;
  target: number;
  color: string;
}

function MacroRow({ label, value, target, color }: MacroRowProps) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const pct = `${Math.round(ratio * 100)}%` as `${number}%`;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: pct, backgroundColor: color }]} />
      </View>
      <Text style={styles.values}>
        {Math.round(value)}
        <Text style={styles.target}>/{Math.round(target)}g</Text>
      </Text>
    </View>
  );
}

function HeroPFCMiniComponent({
  protein,
  fat,
  carbs,
  fiber,
  proteinTarget,
  fatTarget,
  carbsTarget,
  fiberTarget,
}: HeroPFCMiniProps) {
  return (
    <View style={styles.container}>
      <MacroRow label="P" value={protein} target={proteinTarget} color={palette.protein} />
      <MacroRow label="F" value={fat} target={fatTarget} color={palette.fat} />
      <MacroRow label="C" value={carbs} target={carbsTarget} color={palette.carbs} />
      <MacroRow label="繊" value={fiber} target={fiberTarget} color={palette.fiber} />
    </View>
  );
}

export const HeroPFCMini = React.memo(HeroPFCMiniComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...typography.caption2,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    width: 14,
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  barFill: {
    height: 7,
    borderRadius: 4,
  },
  values: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    minWidth: 58,
    textAlign: 'right',
  },
  target: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
});
