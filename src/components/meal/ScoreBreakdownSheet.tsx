import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  type FoodScoreResult,
  GRADE_COLORS,
  GRADE_BG_COLORS,
} from '@/src/services/nutrition/foodScoreCalculator';
import { FoodScoreChip } from './FoodScoreChip';
import { palette, typography, spacing, radius, shadow, pressed } from '@/src/lib/theme';

interface ScoreBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  score: FoodScoreResult;
  foodName?: string;
  isDark: boolean;
}

interface BreakdownRowProps {
  label: string;
  points: number;
  isPositive: boolean;
  textColor: string;
  mutedColor: string;
}

function BreakdownRow({ label, points, isPositive, textColor, mutedColor }: BreakdownRowProps) {
  const color = isPositive ? palette.success : points > 0 ? palette.error : mutedColor;
  const sign = isPositive ? '+' : '-';
  const displayPoints = Math.round(points * 10) / 10;

  return (
    <View style={styles.breakdownRow}>
      <Text style={[typography.caption1, { color: textColor, flex: 1 }]}>{label}</Text>
      <Text style={[typography.caption1, { color, fontWeight: '700' }]}>
        {points > 0 ? `${sign}${displayPoints}` : '–'}
      </Text>
    </View>
  );
}

export function ScoreBreakdownSheet({
  visible,
  onClose,
  score,
  foodName,
  isDark,
}: ScoreBreakdownSheetProps) {
  const bg = isDark ? '#0F172A' : '#FFF9EC';
  const surface = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const mutedColor = isDark ? '#66766F' : '#8D9993';
  const borderColor = isDark ? '#334155' : '#E9E5D8';

  const gradeColor = GRADE_COLORS[score.grade];
  const gradeBg = GRADE_BG_COLORS[score.grade];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.title2, { color: textColor }]}>
            食品スコア詳細
          </Text>
          {foodName && (
            <Text style={[typography.caption1, { color: mutedColor, marginTop: 2 }]}>
              {foodName}
            </Text>
          )}
        </View>

        {/* Score circle */}
        <View style={[styles.scoreCircle, { backgroundColor: gradeBg, borderColor: gradeColor }]}>
          <FoodScoreChip grade={score.grade} value={score.value} />
          <Text style={[typography.caption2, { color: gradeColor, marginTop: 4 }]}>
            Nutri-Score型評価
          </Text>
        </View>

        {/* Grade scale */}
        <View style={[styles.gradeBar, { backgroundColor: surface }, shadow.sm]}>
          {(['A', 'B', 'C', 'D', 'E'] as const).map((g) => {
            const isActive = g === score.grade;
            return (
              <View
                key={g}
                style={[
                  styles.gradeCell,
                  { backgroundColor: GRADE_BG_COLORS[g] },
                  isActive && styles.gradeCellActive,
                ]}
              >
                <Text style={[
                  styles.gradeCellText,
                  { color: GRADE_COLORS[g] },
                  isActive && styles.gradeCellTextActive,
                ]}>
                  {g}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Breakdown */}
        <View style={[styles.section, { backgroundColor: surface }, shadow.sm]}>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>プラス要因</Text>
          <BreakdownRow
            label="食物繊維"
            points={score.breakdown.fiberPoints}
            isPositive
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <BreakdownRow
            label="タンパク質"
            points={score.breakdown.proteinPoints}
            isPositive
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.subtotalRow}>
            <Text style={[typography.caption1, { color: mutedColor }]}>プラス合計</Text>
            <Text style={[typography.caption1, { color: palette.success, fontWeight: '700' }]}>
              +{Math.round(score.breakdown.positivePoints * 10) / 10}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: surface }, shadow.sm]}>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>マイナス要因</Text>
          <BreakdownRow
            label="エネルギー密度"
            points={score.breakdown.energyPenalty}
            isPositive={false}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <BreakdownRow
            label="ナトリウム（塩分）"
            points={score.breakdown.sodiumPenalty}
            isPositive={false}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <BreakdownRow
            label="飽和脂肪酸"
            points={score.breakdown.satFatPenalty}
            isPositive={false}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <BreakdownRow
            label="糖質"
            points={score.breakdown.sugarPenalty}
            isPositive={false}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <BreakdownRow
            label="加工度（NOVA分類）"
            points={score.breakdown.novaPenalty}
            isPositive={false}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.subtotalRow}>
            <Text style={[typography.caption1, { color: mutedColor }]}>マイナス合計</Text>
            <Text style={[typography.caption1, { color: palette.error, fontWeight: '700' }]}>
              -{Math.round(score.breakdown.negativePoints * 10) / 10}
            </Text>
          </View>
        </View>

        {/* Guide */}
        <View style={[styles.guide, { backgroundColor: surface }, shadow.sm]}>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>グレード基準</Text>
          {[
            { grade: 'A', label: '70〜100点: 非常に優れた食品', },
            { grade: 'B', label: '50〜69点: 良い食品' },
            { grade: 'C', label: '30〜49点: 普通の食品' },
            { grade: 'D', label: '10〜29点: 注意が必要な食品' },
            { grade: 'E', label: '0〜9点: 摂取を控えめに' },
          ].map(({ grade, label }) => (
            <View key={grade} style={styles.guideRow}>
              <View style={[styles.guideDot, { backgroundColor: GRADE_COLORS[grade as keyof typeof GRADE_COLORS] }]} />
              <Text style={[typography.caption1, { color: textColor }]}>
                <Text style={{ fontWeight: '700' }}>{grade}</Text>{' '}{label}
              </Text>
            </View>
          ))}
        </View>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={({ pressed: p }) => [styles.closeButton, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={styles.closeButtonText}>閉じる</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 48 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  scoreCircle: {
    alignSelf: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 2,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  gradeBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  gradeCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  gradeCellActive: {
    paddingVertical: spacing.md,
  },
  gradeCellText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeCellTextActive: {
    fontSize: 18,
    fontWeight: '900',
  },
  section: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guide: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  guideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closeButton: {
    backgroundColor: palette.primary,
    marginHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
