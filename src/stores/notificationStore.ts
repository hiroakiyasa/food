import { create } from 'zustand';
const { persist, createJSONStorage } = require('zustand/middleware') as typeof import('zustand/middleware');
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationState {
  mealReminders: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  streakReminders: boolean;
  badgeNotifications: boolean;
  setMealReminders: (enabled: boolean) => void;
  setBreakfastTime: (time: string) => void;
  setLunchTime: (time: string) => void;
  setDinnerTime: (time: string) => void;
  setStreakReminders: (enabled: boolean) => void;
  setBadgeNotifications: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      mealReminders: false,
      breakfastTime: '07:30',
      lunchTime: '12:00',
      dinnerTime: '19:00',
      streakReminders: true,
      badgeNotifications: true,
      setMealReminders: (enabled) => set({ mealReminders: enabled }),
      setBreakfastTime: (time) => set({ breakfastTime: time }),
      setLunchTime: (time) => set({ lunchTime: time }),
      setDinnerTime: (time) => set({ dinnerTime: time }),
      setStreakReminders: (enabled) => set({ streakReminders: enabled }),
      setBadgeNotifications: (enabled) => set({ badgeNotifications: enabled }),
    }),
    {
      name: 'notification-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
