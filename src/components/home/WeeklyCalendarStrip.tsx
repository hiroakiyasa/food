import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radius, shadow, spacing, typography } from '@/src/lib/theme';
import { toLocalDateString } from '@/src/utils/formatters';

interface DayData {
  date: string;
  dayOfWeek: string;
  dayNum: number;
}

interface WeeklyCalendarStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  mealCountByDate: Record<string, number>;
  isDark: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function buildWeekDays(centerDate: string): DayData[] {
  const [year, month, day] = centerDate.split('-').map(Number);
  const center = new Date(year, month - 1, day);
  const dayOfWeek = center.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(center);
  monday.setDate(center.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date: toLocalDateString(date),
      dayOfWeek: WEEKDAYS[date.getDay()],
      dayNum: date.getDate(),
    };
  });
}

function WeeklyCalendarStripComponent({
  selectedDate,
  onSelectDate,
  mealCountByDate,
  isDark,
}: WeeklyCalendarStripProps) {
  const today = toLocalDateString(new Date());
  const days = buildWeekDays(selectedDate);
  const text = isDark ? '#F1F5F9' : palette.ink;
  const muted = isDark ? '#8D9993' : '#66766F';
  const surface = isDark ? '#1E293B' : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          const mealCount = mealCountByDate[day.date] ?? 0;
          const hasMeals = mealCount > 0;
          const moodColor = hasMeals
            ? mealCount >= 3 ? palette.primary : palette.lemon
            : isToday ? palette.primaryLight : '#F4F0E7';

          return (
            <Pressable
              key={day.date}
              onPress={() => onSelectDate(day.date)}
              style={[
                styles.dayItem,
                isSelected && styles.selectedDay,
                !isSelected && isToday && styles.todayRing,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${day.dayOfWeek}曜日 ${day.dayNum}日、食事${mealCount}件`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.dateText, { color: isSelected ? '#FFFFFF' : text }]}>
                {isSelected && isToday ? `${day.dayNum}日` : day.dayNum}
              </Text>
              <Text style={[styles.weekdayText, { color: isSelected ? '#FFFFFF' : muted }]}>
                {isSelected && isToday ? '今日' : day.dayOfWeek}
              </Text>
              <View style={[styles.moodCircle, { backgroundColor: isSelected ? '#FFFFFF' : moodColor }]}>
                <FontAwesome
                  name={hasMeals ? 'smile-o' : 'circle-o'}
                  size={isSelected ? 20 : 17}
                  color={
                    isSelected
                      ? palette.primary
                      : hasMeals && mealCount >= 3
                        ? '#FFFFFF'
                        : muted
                  }
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const WeeklyCalendarStrip = React.memo(WeeklyCalendarStripComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadow.sm,
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexGrow: 1,
    gap: 2,
  },
  dayItem: {
    flex: 1,
    minWidth: 42,
    minHeight: 82,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    gap: 1,
  },
  selectedDay: {
    minWidth: 58,
    backgroundColor: palette.primary,
    ...shadow.colored(palette.primary),
  },
  todayRing: {
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  weekdayText: {
    ...typography.caption2,
    lineHeight: 14,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  moodCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
