import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import type { AIFoodAnalysis } from '@/src/types/nutrition';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { TrafficLightBadge, getItemTrafficLight } from '@/src/components/ui/TrafficLightBadge';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

interface ChatAnalysisCardProps {
  analysis: AIFoodAnalysis;
  selectedMealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  onSave: () => void;
  saving: boolean;
  isDark: boolean;
}

type FAIcon = React.ComponentProps<typeof FontAwesome>['name'];
const MEAL_ICONS: Record<string, FAIcon> = {
  breakfast: 'sun-o',
  lunch: 'sun-o',
  dinner: 'moon-o',
  snack: 'star-o',
};

function PFCBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={pfcStyles.row}>
      <Text style={[pfcStyles.label, { color }]}>{label}</Text>
      <View style={pfcStyles.barBg}>
        <View style={[pfcStyles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[pfcStyles.value, { color }]}>{value.toFixed(1)}g</Text>
    </View>
  );
}

const pfcStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 14, fontSize: 12, fontWeight: '700' },
  barBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E9E5D820', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  value: { width: 52, fontSize: 11, fontWeight: '600', textAlign: 'right' },
});

export function ChatAnalysisCard({
  analysis,
  selectedMealType,
  onMealTypeChange,
  onSave,
  saving,
  isDark,
}: ChatAnalysisCardProps) {
  const c = useThemeColors(isDark);

  const totals = analysis.items.reduce(
    (acc, item) => ({
      energy_kcal: acc.energy_kcal + item.energy_kcal,
      protein_g: acc.protein_g + item.protein_g,
      fat_g: acc.fat_g + item.fat_g,
      carbohydrate_g: acc.carbohydrate_g + item.carbohydrate_g,
    }),
    { energy_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0 },
  );

  const maxPFC = Math.max(totals.protein_g, totals.fat_g, totals.carbohydrate_g, 1);

  return (
    <View style={[styles.container, shadow.lg]}>
      {/* Gradient header */}
      <LinearGradient
        colors={isDark ? ['#145C43', '#28A86B'] : ['#28A86B', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLabel}>
            <FontAwesome name="check-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.headerTitle}>栄養分析結果</Text>
          </View>
          <Text style={styles.itemCount}>{analysis.items.length}品</Text>
        </View>

        <Text style={styles.kcalValue}>
          {Math.round(totals.energy_kcal)}
          <Text style={styles.kcalUnit}> kcal</Text>
        </Text>

        <View style={styles.pfcBars}>
          <PFCBar label="P" value={totals.protein_g} total={maxPFC} color="rgba(255,255,255,0.9)" />
          <PFCBar label="F" value={totals.fat_g} total={maxPFC} color="rgba(255,255,255,0.7)" />
          <PFCBar label="C" value={totals.carbohydrate_g} total={maxPFC} color="rgba(255,255,255,0.8)" />
        </View>
      </LinearGradient>

      {/* Items list */}
      <View style={[styles.body, { backgroundColor: c.surface }]}>
        {analysis.items.map((item, i) => {
          const trafficColor = getItemTrafficLight({
            energy_kcal: item.energy_kcal,
            fat_g: item.fat_g,
            sodium_mg: item.sodium_mg,
            carbohydrate_g: item.carbohydrate_g,
            portion_grams: item.portion_grams,
          });
          return (
            <View
              key={i}
              style={[
                styles.itemRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
              ]}
            >
              <View style={styles.itemNameRow}>
                <TrafficLightBadge color={trafficColor} size={8} />
                <Text style={[styles.itemName, { color: c.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.itemMeta}>
                <Text style={[styles.itemKcal, { color: c.text }]}>
                  {Math.round(item.energy_kcal)}
                  <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '400' }}> kcal</Text>
                </Text>
                <Text style={[styles.itemPortion, { color: c.textMuted }]}>
                  ~{item.portion_grams}g
                </Text>
              </View>
            </View>
          );
        })}

        {/* Meal type selector */}
        <View style={styles.mealTypeSection}>
          <Text style={[styles.mealTypeLabel, { color: c.textMuted }]}>食事タイプ</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((type) => {
              const isActive = selectedMealType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => onMealTypeChange(type)}
                  style={({ pressed: p }) => [
                    styles.mealChip,
                    isActive
                      ? { backgroundColor: palette.primaryMuted, borderColor: palette.primary }
                      : { backgroundColor: c.surfaceAlt, borderColor: 'transparent' },
                    pressed(p),
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <FontAwesome
                    name={MEAL_ICONS[type] ?? 'cutlery'}
                    size={11}
                    color={isActive ? palette.primary : c.textMuted}
                  />
                  <Text
                    style={[
                      styles.mealChipText,
                      { color: isActive ? palette.primaryDark : c.textSecondary },
                    ]}
                  >
                    {MEAL_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Save button */}
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed: p }) => [
            styles.saveButton,
            saving && { opacity: 0.6 },
            shadow.colored(palette.primary),
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel={saving ? '保存中' : 'この内容で保存'}
        >
          {saving ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <>
              <FontAwesome name="check" size={14} color={palette.white} />
              <Text style={styles.saveButtonText}>この内容で保存</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: '600',
  },
  itemCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  kcalValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 4,
  },
  kcalUnit: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0,
  },
  pfcBars: {
    gap: 6,
    marginTop: 4,
  },
  body: {
    padding: spacing.lg,
  },
  itemRow: {
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  itemMeta: {
    alignItems: 'flex-end',
    gap: 1,
  },
  itemKcal: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemPortion: {
    fontSize: 10,
    fontWeight: '400',
  },
  mealTypeSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  mealTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  mealChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    minHeight: 48,
  },
  saveButtonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
