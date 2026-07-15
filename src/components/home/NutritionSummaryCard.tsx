import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { NutrientBar } from '@/src/components/chart/NutrientBar';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed,
} from '@/src/lib/theme';
import type { NutrientStatus } from '@/src/types/nutrientBalance';

interface NutritionSummaryCardProps {
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  proteinTarget: number;
  fatTarget: number;
  carbsTarget: number;
  fiberTarget: number;
  isDark: boolean;
}

function getStatus(ratio: number): NutrientStatus {
  if (ratio < 0.8) return 'deficient';
  if (ratio > 1.3) return 'excessive';
  return 'adequate';
}

function NutritionSummaryCardComponent({
  protein,
  fat,
  carbs,
  fiber,
  proteinTarget,
  fatTarget,
  carbsTarget,
  fiberTarget,
  isDark,
}: NutritionSummaryCardProps) {
  const router = useRouter();
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  const proteinRatio = proteinTarget > 0 ? protein / proteinTarget : 0;
  const fatRatio = fatTarget > 0 ? fat / fatTarget : 0;
  const carbsRatio = carbsTarget > 0 ? carbs / carbsTarget : 0;
  const fiberRatio = fiberTarget > 0 ? fiber / fiberTarget : 0;

  return (
    <Pressable
      onPress={() => router.push('/(modals)/nutrition-balance')}
      style={({ pressed: p }) => [
        styles.card,
        { backgroundColor: surface },
        shadow.md,
        pressed(p),
      ]}
      accessibilityRole="button"
      accessibilityLabel="栄養バランスを見る"
    >
      {/* Card header */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: textSecondary }]}>
          PFCバランス
        </Text>
        <Text style={[styles.linkText, { color: palette.primary }]}>
          栄養バランスを詳しく →
        </Text>
      </View>

      {/* Nutrient bars */}
      <NutrientBar
        nameJa="たんぱく質"
        currentValue={protein}
        targetValue={proteinTarget}
        ratio={proteinRatio}
        status={getStatus(proteinRatio)}
        color={palette.protein}
        unit="g"
        isDark={isDark}
      />
      <NutrientBar
        nameJa="脂質"
        currentValue={fat}
        targetValue={fatTarget}
        ratio={fatRatio}
        status={getStatus(fatRatio)}
        color={palette.fat}
        unit="g"
        isDark={isDark}
      />
      <NutrientBar
        nameJa="炭水化物"
        currentValue={carbs}
        targetValue={carbsTarget}
        ratio={carbsRatio}
        status={getStatus(carbsRatio)}
        color={palette.carbs}
        unit="g"
        isDark={isDark}
      />
      <NutrientBar
        nameJa="食物繊維"
        currentValue={fiber}
        targetValue={fiberTarget}
        ratio={fiberRatio}
        status={getStatus(fiberRatio)}
        color={palette.fiber}
        unit="g"
        isDark={isDark}
      />
    </Pressable>
  );
}

export const NutritionSummaryCard = React.memo(NutritionSummaryCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...commonStyles.sectionHeader,
    marginBottom: 0,
  },
  linkText: {
    ...typography.caption1,
    fontWeight: '600',
  },
});
