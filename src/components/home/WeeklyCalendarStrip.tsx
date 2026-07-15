import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { palette, typography, spacing, radius } from '@/src/lib/theme';

interface DayData {
  date: string;
  dayOfWeek: string;
  dayNum: number;
  hasMeals: boolean;
}

interface WeeklyCalendarStripProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  mealCountByDate: Record<string, number>;
  isDark: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function buildWeekDays(centerDate: string): DayData[] {
  const center = new Date(centerDate);
  const dayOfWeek = center.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(center);
  monday.setDate(center.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return {
      date: dateStr,
      dayOfWeek: WEEKDAYS[d.getDay()],
      dayNum: d.getDate(),
      hasMeals: false,
    };
  });
}

function WeeklyCalendarStripComponent({
  selectedDate,
  onSelectDate,
  mealCountByDate,
  isDark,
}: WeeklyCalendarStripProps) {
  const today = new Date().toISOString().split('T')[0];
  const days = buildWeekDays(selectedDate);
  const textMuted = isDark ? '#64748B' : '#94A3B8';
  const surfaceAlt = isDark ? '#334155' : '#F1F5F9';

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          const hasMeals = (mealCountByDate[day.date] ?? 0) > 0;

          return (
            <Pressable
              key={day.date}
              onPress={() => onSelectDate(day.date)}
              style={[
                styles.dayItem,
                isSelected && { backgroundColor: palette.primary },
                !isSelected && isToday && styles.todayRing,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${day.dayOfWeek}曜日 ${day.dayNum}日`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.weekdayText,
                  { color: isSelected ? palette.white : textMuted },
                ]}
              >
                {day.dayOfWeek}
              </Text>
              <Text
                style={[
                  styles.dayNumText,
                  {
                    color: isSelected
                      ? palette.white
                      : isDark
                        ? '#F1F5F9'
                        : '#0F172A',
                  },
                ]}
              >
                {day.dayNum}
              </Text>
              {hasMeals && (
                <View
                  style={[
                    styles.mealDot,
                    {
                      backgroundColor: isSelected ? palette.white : palette.primary,
                    },
                  ]}
                />
              )}
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
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    gap: spacing.xs,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    minWidth: 40,
    gap: 2,
  },
  todayRing: {
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  weekdayText: {
    ...typography.caption2,
  },
  dayNumText: {
    fontSize: 16,
    fontWeight: '700',
  },
  mealDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
