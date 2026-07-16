import { create } from 'zustand';
const { persist, createJSONStorage } = require('zustand/middleware') as typeof import('zustand/middleware');
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CycleStore {
  /** 月経周期トラッキングを有効にしているか */
  isEnabled: boolean;
  /** 最後の生理開始日 (ISO date string) */
  lastPeriodStart: string | null;
  /** 平均サイクル長 (日) */
  avgCycleLength: number;
  /** 平均生理期間 (日) */
  avgPeriodLength: number;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setLastPeriodStart: (date: string | null) => void;
  setAvgCycleLength: (days: number) => void;
  setAvgPeriodLength: (days: number) => void;
  /** 今日を生理開始日として記録する */
  recordPeriodStart: () => void;
}

export const useCycleStore = create<CycleStore>()(
  persist(
    (set) => ({
      isEnabled: false,
      lastPeriodStart: null,
      avgCycleLength: 28,
      avgPeriodLength: 5,

      setEnabled: (isEnabled) => set({ isEnabled }),
      setLastPeriodStart: (lastPeriodStart) => set({ lastPeriodStart }),
      setAvgCycleLength: (avgCycleLength) => set({ avgCycleLength }),
      setAvgPeriodLength: (avgPeriodLength) => set({ avgPeriodLength }),
      recordPeriodStart: () =>
        set({ lastPeriodStart: new Date().toISOString().split('T')[0] }),
    }),
    {
      name: 'cycle-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
