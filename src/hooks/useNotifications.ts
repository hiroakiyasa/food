import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/src/stores/notificationStore';
import {
  scheduleMealReminder,
  cancelMealReminder,
} from '@/src/services/notifications/notificationService';

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

export function useNotificationSetup() {
  const router = useRouter();
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)');
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);
}

export function useNotificationPreferences() {
  const {
    mealReminders,
    breakfastTime,
    lunchTime,
    dinnerTime,
    streakReminders,
  } = useNotificationStore();

  useEffect(() => {
    if (mealReminders) {
      const bf = parseTime(breakfastTime);
      scheduleMealReminder('breakfast-reminder', '朝食リマインダー', '朝食を記録しましょう', bf.hour, bf.minute);
      const ln = parseTime(lunchTime);
      scheduleMealReminder('lunch-reminder', '昼食リマインダー', '昼食を記録しましょう', ln.hour, ln.minute);
      const dn = parseTime(dinnerTime);
      scheduleMealReminder('dinner-reminder', '夕食リマインダー', '夕食を記録しましょう', dn.hour, dn.minute);
    } else {
      cancelMealReminder('breakfast-reminder');
      cancelMealReminder('lunch-reminder');
      cancelMealReminder('dinner-reminder');
    }
  }, [mealReminders, breakfastTime, lunchTime, dinnerTime]);

  useEffect(() => {
    if (streakReminders) {
      scheduleMealReminder('streak-reminder', '今日をやさしく振り返る', '一品だけでも大丈夫。覚えている範囲で記録しませんか？', 21, 0);
    } else {
      cancelMealReminder('streak-reminder');
    }
  }, [streakReminders]);
}
