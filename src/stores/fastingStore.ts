import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FastingProtocol, FastingSession } from '@/src/services/fasting/fastingEngine';

interface FastingStore {
  /** アクティブな断食セッション */
  activeSession: FastingSession | null;
  /** 選択中のプロトコル */
  selectedProtocol: FastingProtocol;
  /** 食事ウィンドウ開始時間 (0-23) */
  eatStartHour: number;
  /** 食事ウィンドウ終了時間 (0-23) */
  eatEndHour: number;
  /** 断食機能を有効にしているか */
  isEnabled: boolean;

  // Actions
  setSession: (session: FastingSession | null) => void;
  setProtocol: (protocol: FastingProtocol) => void;
  setEatStartHour: (hour: number) => void;
  setEatEndHour: (hour: number) => void;
  setEnabled: (enabled: boolean) => void;
  endSession: () => void;
}

export const useFastingStore = create<FastingStore>()(
  persist(
    (set) => ({
      activeSession: null,
      selectedProtocol: '16:8',
      eatStartHour: 12,
      eatEndHour: 20,
      isEnabled: false,

      setSession: (session) => set({ activeSession: session }),
      setProtocol: (protocol) => set({ selectedProtocol: protocol }),
      setEatStartHour: (hour) => set({ eatStartHour: hour }),
      setEatEndHour: (hour) => set({ eatEndHour: hour }),
      setEnabled: (enabled) => set({ isEnabled: enabled }),
      endSession: () =>
        set((state) => ({
          activeSession: state.activeSession
            ? { ...state.activeSession, completed: true }
            : null,
        })),
    }),
    {
      name: 'fasting-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        selectedProtocol: state.selectedProtocol,
        eatStartHour: state.eatStartHour,
        eatEndHour: state.eatEndHour,
        isEnabled: state.isEnabled,
      }),
    },
  ),
);
