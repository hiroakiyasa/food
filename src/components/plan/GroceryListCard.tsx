import { memo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  palette, typography, spacing, radius, useThemeColors, pressed,
} from '@/src/lib/theme';
import type { GroceryList, GroceryCategory, GroceryItem } from '@/src/hooks/useWeeklyMealPlan';

interface GroceryListCardProps {
  groceryList: GroceryList;
  isDark: boolean;
}

function GroceryCategorySection({
  category,
  checkedItems,
  onToggle,
  isDark,
}: {
  category: GroceryCategory;
  checkedItems: Set<string>;
  onToggle: (key: string) => void;
  isDark: boolean;
}) {
  const c = useThemeColors(isDark);

  return (
    <View style={styles.categorySection}>
      <Text style={[styles.categoryHeader, { color: c.textSecondary }]}>
        {category.emoji} {category.name}
      </Text>
      {category.items.map((item, i) => {
        const key = `${category.name}::${item.name}`;
        const checked = checkedItems.has(key);
        return (
          <Pressable
            key={i}
            onPress={() => onToggle(key)}
            style={({ pressed: p }) => [
              styles.itemRow,
              i < category.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
              pressed(p),
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            {/* Checkbox */}
            <View style={[
              styles.checkbox,
              { borderColor: checked ? palette.primary : c.border },
              checked && { backgroundColor: palette.primary },
            ]}>
              {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>

            {/* Item info */}
            <View style={styles.itemInfo}>
              <Text style={[
                typography.caption1,
                { color: checked ? c.textMuted : c.text },
                checked && styles.strikethrough,
              ]}>
                {item.name}
              </Text>
              <Text style={[typography.caption2, { color: c.textMuted }]}>
                {item.amount}
              </Text>
            </View>

            {/* Cost */}
            {item.estimated_cost_yen && (
              <Text style={[typography.caption2, { color: c.textMuted }]}>
                ¥{item.estimated_cost_yen.toLocaleString()}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export const GroceryListCard = memo(function GroceryListCard({
  groceryList,
  isDark,
}: GroceryListCardProps) {
  const c = useThemeColors(isDark);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const handleToggle = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const totalItems = groceryList.categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedCount = checkedItems.size;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        <Text style={[typography.caption1, { color: c.textSecondary }]}>
          {checkedCount} / {totalItems} 個
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` as `${number}%`,
                backgroundColor: palette.primary,
              },
            ]}
          />
        </View>
        {groceryList.total_estimated_cost_yen && (
          <Text style={[typography.caption1, { color: c.textSecondary }]}>
            〜¥{groceryList.total_estimated_cost_yen.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Categories */}
      {groceryList.categories.map((cat, i) => (
        <GroceryCategorySection
          key={i}
          category={cat}
          checkedItems={checkedItems}
          onToggle={handleToggle}
          isDark={isDark}
        />
      ))}

      {/* Clear all */}
      {checkedCount > 0 && (
        <Pressable
          onPress={() => setCheckedItems(new Set())}
          style={({ pressed: p }) => [styles.clearBtn, pressed(p)]}
        >
          <Text style={[typography.caption1, { color: c.textMuted }]}>
            チェックをリセット
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: { height: 6, borderRadius: 3 },
  categorySection: { gap: 2 },
  categoryHeader: {
    ...typography.caption1,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  itemInfo: { flex: 1, gap: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
