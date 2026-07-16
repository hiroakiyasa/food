import { create } from 'zustand';
const { persist, createJSONStorage } = require('zustand/middleware') as typeof import('zustand/middleware');
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HealthState {
  isConnected: boolean;
  lastSyncAt: string | null;
  isSyncing: boolean;
  setConnected: (connected: boolean) => void;
  setLastSyncAt: (date: string | null) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      isConnected: false,
      lastSyncAt: null,
      isSyncing: false,
      setConnected: (isConnected) => set({ isConnected }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      setSyncing: (isSyncing) => set({ isSyncing }),
    }),
    {
      name: 'health-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isConnected: state.isConnected,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);
