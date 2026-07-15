import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useActiveConditions } from '@/src/hooks/useActiveConditions';
import { ALL_GUIDELINES } from '@/src/services/nutrition/conditionGoals';
import { CATEGORY_NAMES } from '@/src/types/nutritionGuidelines';
import {
  palette, typography, spacing, radius,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Build ordered category list from guidelines
const CATEGORY_IDS = Array.from(new Set(ALL_GUIDELINES.map((g) => g.categoryId)));

const CATEGORY_EMOJI: Record<string, string> = {
  '1_LifeStage':      '👶',
  '2_BodyGoal':       '⚖️',
  '3_Lifestyle':      '🥗',
  '4_ChronicDisease': '🏥',
  '5_DailyHealth':    '💪',
};

function getCategoryLabel(categoryId: string): string {
  const emoji = CATEGORY_EMOJI[categoryId];
  const name = CATEGORY_NAMES[categoryId] ?? categoryId;
  return emoji ? `${emoji} ${name}` : name;
}

export default function ConditionSelectModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { activeConditions, updateActiveConditions, isPending } = useActiveConditions();

  const [selected, setSelected] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // null = show all

  useEffect(() => {
    setSelected(activeConditions);
  }, [activeConditions]);

  const toggleCondition = useCallback((subCategoryName: string) => {
    setSelected((prev) =>
      prev.includes(subCategoryName)
        ? prev.filter((x) => x !== subCategoryName)
        : [...prev, subCategoryName]
    );
  }, []);

  const handleSave = async () => {
    try {
      await updateActiveConditions(selected);
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  // Filter guidelines by active category filter
  const visibleGuidelines = activeFilter
    ? ALL_GUIDELINES.filter((g) => g.categoryId === activeFilter)
    : ALL_GUIDELINES;

  // Group by categoryId for rendering
  const grouped = CATEGORY_IDS
    .filter((catId) => !activeFilter || catId === activeFilter)
    .map((catId) => ({
      catId,
      label: getCategoryLabel(catId),
      items: visibleGuidelines.filter((g) => g.categoryId === catId),
    }));

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: c.divider }]}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          onPress={() => setActiveFilter(null)}
          style={({ pressed: p }) => [
            commonStyles.chip,
            activeFilter === null && commonStyles.chipActive,
            pressed(p),
          ]}
        >
          <Text
            style={[
              commonStyles.chipText,
              activeFilter === null && commonStyles.chipTextActive,
            ]}
          >
            すべて
          </Text>
        </Pressable>
        {CATEGORY_IDS.map((catId) => (
          <Pressable
            key={catId}
            onPress={() => setActiveFilter(activeFilter === catId ? null : catId)}
            style={({ pressed: p }) => [
              commonStyles.chip,
              activeFilter === catId && commonStyles.chipActive,
              pressed(p),
            ]}
          >
            <Text
              style={[
                commonStyles.chipText,
                activeFilter === catId && commonStyles.chipTextActive,
              ]}
            >
              {getCategoryLabel(catId)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={commonStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selected.length > 0 && (
          <Text style={[typography.caption1, { color: palette.primary, marginBottom: spacing.lg, fontWeight: '600' }]}>
            {selected.length}個の条件を選択中
          </Text>
        )}

        {grouped.map(({ catId, label, items }) => (
          <View key={catId} style={styles.categorySection}>
            <Text style={[commonStyles.sectionHeader, { color: c.textSecondary }]}>
              {label}
            </Text>

            {items.map((guideline) => {
              const isSelected = selected.includes(guideline.subCategoryName);
              return (
                <Pressable
                  key={guideline.subCategoryName}
                  onPress={() => toggleCondition(guideline.subCategoryName)}
                  style={({ pressed: p }) => [
                    styles.conditionRow,
                    { backgroundColor: c.surface, borderColor: isSelected ? palette.primary : c.border },
                    isSelected && { backgroundColor: palette.primaryLight },
                    pressed(p),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={guideline.subCategoryName}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.conditionLeft}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.conditionText}>
                      <Text style={[typography.bodyBold, { color: isSelected ? palette.primaryDark : c.text }]}>
                        {guideline.subCategoryName}
                      </Text>
                      <Text style={[typography.caption1, { color: isSelected ? palette.primary : c.textMuted, marginTop: 2 }]} numberOfLines={2}>
                        {guideline.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.nutrientBadges}>
                    {guideline.focusNutrients.slice(0, 2).map((fn) => (
                      <View
                        key={fn.nutrientKey}
                        style={[
                          styles.nutrientBadge,
                          { backgroundColor: fn.action === 'increase' ? palette.primaryMuted : '#EF444433' },
                        ]}
                      >
                        <Text style={[styles.nutrientBadgeText, { color: fn.action === 'increase' ? palette.primaryDark : palette.error }]}>
                          {fn.action === 'increase' ? '↑' : '↓'} {fn.nutrientName}
                        </Text>
                      </View>
                    ))}
                    {guideline.focusNutrients.length > 2 && (
                      <Text style={[typography.caption2, { color: c.textMuted }]}>
                        +{guideline.focusNutrients.length - 2}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        <Pressable
          onPress={handleSave}
          disabled={isPending}
          style={({ pressed: p }) => [
            commonStyles.buttonPrimary,
            { marginTop: spacing['3xl'] },
            isPending && { opacity: 0.6 },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel={isPending ? '保存中' : '保存する'}
        >
          <Text style={commonStyles.buttonText}>
            {isPending ? '保存中...' : `${selected.length}件の条件で保存する`}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 56,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: { flex: 1 },
  categorySection: {
    marginBottom: spacing.xl,
  },
  conditionRow: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  conditionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.sm,
  },
  conditionText: { flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  checkmark: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  nutrientBadges: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
    maxWidth: 100,
  },
  nutrientBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nutrientBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
