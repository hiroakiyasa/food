import { ScrollView, StyleSheet, View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useMealsByDate } from '@/src/hooks/useMeals';
import { useUIStore } from '@/src/stores/uiStore';
import { formatCalories, formatDateFull, getToday } from '@/src/utils/formatters';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/src/lib/constants';
import { QuickAddBar } from '@/src/components/record/QuickAddBar';
import { MealSectionCard } from '@/src/components/record/MealSectionCard';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

export default function RecordScreen() {
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { selectedDate, setSelectedDate } = useUIStore();
  const { data: meals = [] } = useMealsByDate(selectedDate);
  const router = useRouter();
  const today = getToday();

  const navigateDay = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  const showAddOptions = (mealType: MealType) => {
    const options = ['写真で記録', 'テキストで検索', 'AIチャットで記録', 'キャンセル'];
    const cancelButtonIndex = 3;

    const handleSelection = (index: number) => {
      if (index === 0) {
        router.push('/(modals)/camera');
      } else if (index === 1) {
        router.push(`/(modals)/food-search?mealType=${mealType}`);
      } else if (index === 2) {
        router.push(`/(modals)/chat-meal?mealType=${mealType}`);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: `${MEAL_TYPE_LABELS[mealType]}を追加`,
        },
        handleSelection,
      );
    } else {
      Alert.alert(
        `${MEAL_TYPE_LABELS[mealType]}を追加`,
        undefined,
        [
          { text: '写真で記録', onPress: () => handleSelection(0) },
          { text: 'テキストで検索', onPress: () => handleSelection(1) },
          { text: 'AIチャットで記録', onPress: () => handleSelection(2) },
          { text: 'キャンセル', style: 'cancel' },
        ],
      );
    }
  };

  const mealsByType = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = meals.filter((m) => m.meal_type === type);
      return acc;
    },
    {} as Record<MealType, typeof meals>,
  );

  const isToday = selectedDate === today;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick Add Bar */}
      <QuickAddBar isDark={isDark} />

      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <Pressable
          onPress={() => navigateDay(-1)}
          style={({ pressed: p }) => [
            styles.dateButton,
            { backgroundColor: c.surfaceAlt },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel="前の日"
        >
          <Text style={[styles.dateArrow, { color: c.text }]}>‹</Text>
        </Pressable>

        <Text style={[styles.dateTitle, { color: c.text }]}>
          {formatDateFull(selectedDate)}
        </Text>

        <Pressable
          onPress={() => navigateDay(1)}
          style={({ pressed: p }) => [
            styles.dateButton,
            { backgroundColor: c.surfaceAlt },
            pressed(p),
          ]}
          accessibilityRole="button"
          accessibilityLabel="次の日"
        >
          <Text style={[styles.dateArrow, { color: c.text }]}>›</Text>
        </Pressable>

        {!isToday && (
          <Pressable
            onPress={goToToday}
            style={({ pressed: p }) => [styles.todayButton, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="今日に移動"
          >
            <Text style={styles.todayButtonText}>今日</Text>
          </Pressable>
        )}
      </View>

      {/* Meal Sections */}
      {MEAL_TYPES.map((type) => (
        <MealSectionCard
          key={type}
          mealType={type}
          meals={mealsByType[type]}
          onAdd={() => showAddOptions(type)}
          isDark={isDark}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  dateButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  dateArrow: { fontSize: 24, fontWeight: '300' },
  dateTitle: { ...typography.title2, flex: 1, textAlign: 'center' },
  todayButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  todayButtonText: {
    color: palette.white,
    ...typography.caption1,
    fontWeight: '600',
  },
});
