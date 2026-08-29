import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  NUTRIENT_SECTIONS,
  DYNAMIC_NUTRIENT_SECTIONS,
  countNutrientItems,
  type NutrientSection,
  type DynamicNutrientSection,
} from '@/src/lib/nutrientDetailDefs';
import { DISPLAY_TO_SHORT_KEY } from '@/src/lib/nutrientKeyMapping';
import {
  palette,
  typography,
  spacing,
  radius,
  useThemeColors,
} from '@/src/lib/theme';
import type { FoodItemWithDetails } from '@/src/services/food/fetchFoodDetail';
import type { NutrientsData, DetailData } from '@/src/services/food/micronutrientStorage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ───

interface NutritionDetailSectionsProps {
  detail: FoodItemWithDetails;
  portionGrams: number;
  isDark: boolean;
}

// ─── Helpers ───

function formatValue(value: number, unit: string): string {
  if (unit === 'g') return value < 0.1 ? value.toFixed(2) : value.toFixed(1);
  if (unit === 'mg') return value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : Math.round(value).toString();
  if (unit === 'µg' || unit === 'ug') return value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : Math.round(value).toString();
  return value.toFixed(1);
}

/**
 * Looks up a nutrient value from the nutrients Storage object via short key.
 */
function lookupNutrientValue(
  nutrients: NutrientsData | null | undefined,
  storageSection: NutrientSection['storageSection'],
  displayKey: string,
): number | null {
  if (!nutrients) return null;
  const shortKey = DISPLAY_TO_SHORT_KEY[displayKey];
  if (!shortKey) return null;
  const sectionData = nutrients[storageSection];
  if (!sectionData) return null;
  const val = sectionData[shortKey];
  return typeof val === 'number' ? val : null;
}

// ─── CollapsibleSection (nutrients) ───

interface CollapsibleSectionProps {
  section: NutrientSection;
  nutrients: NutrientsData | null;
  ratio: number;
  isDark: boolean;
}

const CollapsibleSection = React.memo(function CollapsibleSection({
  section,
  nutrients,
  ratio,
  isDark,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const c = useThemeColors(isDark);
  const count = countNutrientItems(section, nutrients);
  const sectionColor = palette[section.paletteKey];

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((prev) => !prev);
  }, []);

  if (count === 0) return null;

  return (
    <View style={[styles.section, { borderColor: c.border }]}>
      <Pressable onPress={toggle} style={styles.sectionHeader}>
        <Text style={[styles.chevron, { color: sectionColor }]}>
          {isOpen ? '▼' : '▶'}
        </Text>
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          {section.title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: sectionColor + '1A' }]}>
          <Text style={[styles.countText, { color: sectionColor }]}>
            {count}種
          </Text>
        </View>
      </Pressable>

      {isOpen && (
        <View style={[styles.sectionBody, { backgroundColor: c.surfaceAlt }]}>
          {section.items.map((item, idx) => {
            const rawValue = lookupNutrientValue(nutrients, section.storageSection, item.jsonKey);
            if (rawValue == null) return null;
            const adjusted = rawValue * ratio;
            return (
              <React.Fragment key={item.jsonKey}>
                {idx > 0 && (
                  <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
                )}
                <View style={styles.nutrientRow}>
                  <Text style={[styles.nutrientLabel, { color: c.text }]}>
                    {item.nameJa}
                  </Text>
                  <Text style={[styles.nutrientValue, { color: sectionColor }]}>
                    {formatValue(adjusted, item.unit)} {item.unit}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
});

// ─── DynamicCollapsibleSection (details) ───

interface DynamicCollapsibleSectionProps {
  section: DynamicNutrientSection;
  detail: DetailData | null;
  ratio: number;
  isDark: boolean;
}

const DynamicCollapsibleSection = React.memo(function DynamicCollapsibleSection({
  section,
  detail,
  ratio,
  isDark,
}: DynamicCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const c = useThemeColors(isDark);

  const sectionData = detail?.[section.detailSection] as Record<string, number> | undefined;
  const validItems = section.items.filter(item => sectionData?.[item.rawKey] != null);
  if (validItems.length === 0) return null;

  const sectionColor = palette.minerals;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <View style={[styles.section, { borderColor: c.border }]}>
      <Pressable onPress={toggle} style={styles.sectionHeader}>
        <Text style={[styles.chevron, { color: sectionColor }]}>
          {isOpen ? '▼' : '▶'}
        </Text>
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          {section.title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: sectionColor + '1A' }]}>
          <Text style={[styles.countText, { color: sectionColor }]}>
            {validItems.length}種
          </Text>
        </View>
      </Pressable>

      {isOpen && sectionData && (
        <View style={[styles.sectionBody, { backgroundColor: c.surfaceAlt }]}>
          {validItems.map((item, idx) => {
            const rawValue = sectionData[item.rawKey];
            if (rawValue == null) return null;
            const adjusted = rawValue * ratio;
            return (
              <React.Fragment key={item.rawKey}>
                {idx > 0 && (
                  <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
                )}
                <View style={styles.nutrientRow}>
                  <Text style={[styles.nutrientLabel, { color: c.text }]}>
                    {item.nameJa}
                  </Text>
                  <Text style={[styles.nutrientValue, { color: sectionColor }]}>
                    {formatValue(adjusted, item.unit)} {item.unit}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
});

// ─── Main component ───

export const NutritionDetailSections = React.memo(function NutritionDetailSections({
  detail,
  portionGrams,
  isDark,
}: NutritionDetailSectionsProps) {
  const ratio = portionGrams / 100;
  const nutrients = detail._nutrients;
  const detailData = detail._detail;

  const hasNutrients = nutrients != null;
  const hasDetails = detailData != null;

  if (!hasNutrients && !hasDetails) return null;

  return (
    <View style={styles.container}>
      {NUTRIENT_SECTIONS.map((section) => (
        <CollapsibleSection
          key={section.key}
          section={section}
          nutrients={nutrients}
          ratio={ratio}
          isDark={isDark}
        />
      ))}
      {DYNAMIC_NUTRIENT_SECTIONS.map((section) => (
        <DynamicCollapsibleSection
          key={section.key}
          section={section}
          detail={detailData}
          ratio={ratio}
          isDark={isDark}
        />
      ))}
    </View>
  );
});

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  section: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  chevron: {
    fontSize: 12,
    width: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.caption1,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionBody: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  nutrientLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  nutrientValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
