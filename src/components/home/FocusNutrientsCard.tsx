import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { type MergedFocusNutrient } from '@/src/hooks/useActiveConditions';
import type { FocusNutrientValue } from '@/src/hooks/useFocusNutrientValues';
import { FocusNutrientRow } from '@/src/components/home/FocusNutrientRow';
import {
  palette, typography, spacing, radius, shadow,
  pressed, useThemeColors,
} from '@/src/lib/theme';

interface FocusNutrientsCardProps {
  focusNutrients: MergedFocusNutrient[];
  focusValueMap: Map<string, FocusNutrientValue>;
  isDark: boolean;
  onSettingsPress: () => void;
}

function NutrientDetailModal({
  nutrient,
  isDark,
  onClose,
}: {
  nutrient: MergedFocusNutrient;
  isDark: boolean;
  onClose: () => void;
}) {
  const c = useThemeColors(isDark);
  const isIncrease = nutrient.action === 'increase';
  const color = isIncrease ? palette.success : palette.warning;
  const actionLabel = isIncrease ? '↑ 積極的に摂りたい' : '↓ 控えたい';
  const priorityLabel =
    nutrient.priority === 'High' ? '優先度: 高' :
    nutrient.priority === 'Medium' ? '優先度: 中' : '優先度: 低';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="閉じる">
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
          <View style={[styles.handleBar, { backgroundColor: c.divider }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHeader}>
              <View style={[styles.nutrientIcon, { backgroundColor: color + '22' }]}>
                <Text style={[typography.title3, { color }]}>
                  {isIncrease ? '↑' : '↓'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.title3, { color: c.text }]}>{nutrient.nutrientName}</Text>
                <Text style={[typography.caption1, { color }]}>{actionLabel}</Text>
              </View>
            </View>

            <View style={[styles.priorityBadge, { backgroundColor: color + '22' }]}>
              <Text style={[typography.caption1, { color, fontWeight: '700' }]}>{priorityLabel}</Text>
            </View>

            <Text style={[typography.caption1, { color: c.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              理由
            </Text>
            <Text style={[typography.body, { color: c.text, lineHeight: 22 }]}>
              {nutrient.reason}
            </Text>

            <Text style={[typography.caption1, { color: c.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              根拠
            </Text>
            <Text style={[typography.body, { color: c.text, lineHeight: 22 }]}>
              {nutrient.evidenceBase}
            </Text>

            <Text style={[typography.caption1, { color: c.textMuted, marginTop: spacing.lg }]}>
              条件: {nutrient.sourceCondition}
            </Text>

            <Pressable
              onPress={onClose}
              style={({ pressed: p }) => [styles.closeButton, { backgroundColor: c.surfaceAlt }, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Text style={[typography.body, { color: c.textSecondary }]}>閉じる</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const MAX_VISIBLE = 5;

function FocusNutrientsCardComponent({
  focusNutrients,
  focusValueMap,
  isDark,
  onSettingsPress,
}: FocusNutrientsCardProps) {
  const c = useThemeColors(isDark);
  const [selectedNutrient, setSelectedNutrient] = useState<MergedFocusNutrient | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Empty state — prompt to configure conditions
  if (focusNutrients.length === 0) {
    return (
      <Pressable
        onPress={onSettingsPress}
        style={({ pressed: p }) => [
          styles.card,
          { backgroundColor: c.surface },
          shadow.md,
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel="栄養管理条件を設定する"
      >
        <View style={styles.emptyState}>
          <Text style={[typography.title3, { color: c.textSecondary }]}>
            今日の注目栄養素
          </Text>
          <Text style={[typography.caption1, { color: c.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
            あなたの状況（妊娠中・ヴィーガン等）を設定すると、毎日の画面に摂取すべき栄養素が表示されます
          </Text>
          <View style={[styles.ctaChip, { borderColor: palette.primary }]}>
            <Text style={[typography.caption1, { color: palette.primary, fontWeight: '600' }]}>
              条件を設定する →
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const visible = showAll ? focusNutrients : focusNutrients.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, focusNutrients.length - MAX_VISIBLE);

  // Derive subtitle from source conditions (unique)
  const conditionNames = Array.from(new Set(focusNutrients.map((fn) => fn.sourceCondition)));
  const subtitle = conditionNames.slice(0, 2).join('・') + (conditionNames.length > 2 ? ' 他' : '');

  return (
    <View style={[styles.card, { backgroundColor: c.surface }, shadow.md]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.caption1, { color: c.textSecondary, fontWeight: '700', letterSpacing: 0.5 }]}>
            今日の注目栄養素
          </Text>
          {subtitle ? (
            <Text style={[typography.caption2, { color: c.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onSettingsPress}
          style={({ pressed: p }) => [styles.settingsBtn, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="栄養管理条件を設定"
        >
          <Text style={{ color: c.textMuted, fontSize: 16 }}>⚙</Text>
        </Pressable>
      </View>

      {/* Nutrient rows */}
      {visible.map((fn, idx) => (
        <React.Fragment key={`${fn.nutrientKey ?? fn.nutrientName}-${idx}`}>
          {idx > 0 && (
            <View style={[styles.divider, { backgroundColor: c.divider }]} />
          )}
          <FocusNutrientRow
            nutrient={fn}
            valueData={fn.nutrientKey ? focusValueMap.get(fn.nutrientKey) : undefined}
            isDark={isDark}
            onPress={() => setSelectedNutrient(fn)}
          />
        </React.Fragment>
      ))}

      {/* Show more / less toggle */}
      {hiddenCount > 0 && !showAll && (
        <Pressable
          onPress={() => setShowAll(true)}
          style={({ pressed: p }) => [styles.showMoreBtn, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel={`他${hiddenCount}件を表示`}
        >
          <Text style={[typography.caption1, { color: palette.primary, fontWeight: '600' }]}>
            他{hiddenCount}件を表示 ›
          </Text>
        </Pressable>
      )}
      {showAll && hiddenCount > 0 && (
        <Pressable
          onPress={() => setShowAll(false)}
          style={({ pressed: p }) => [styles.showMoreBtn, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="折りたたむ"
        >
          <Text style={[typography.caption1, { color: c.textMuted, fontWeight: '600' }]}>
            折りたたむ ‹
          </Text>
        </Pressable>
      )}

      {selectedNutrient && (
        <NutrientDetailModal
          nutrient={selectedNutrient}
          isDark={isDark}
          onClose={() => setSelectedNutrient(null)}
        />
      )}
    </View>
  );
}

export const FocusNutrientsCard = React.memo(FocusNutrientsCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  settingsBtn: {
    padding: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  ctaChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    marginTop: spacing.xs,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 48,
    maxHeight: '80%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  nutrientIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
});
