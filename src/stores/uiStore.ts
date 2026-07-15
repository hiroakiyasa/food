import { create } from 'zustand';

export type LocationPermissionStatus =
  | 'idle'
  | 'loading'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  updatedAt: string;
}

interface UIState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  insightsPeriod: '1W' | '1M' | '3M';
  setInsightsPeriod: (period: '1W' | '1M' | '3M') => void;
  currentLocation: CurrentLocation | null;
  locationStatus: LocationPermissionStatus;
  setCurrentLocation: (location: CurrentLocation | null) => void;
  setLocationStatus: (status: LocationPermissionStatus) => void;
}

const today = new Date().toISOString().split('T')[0];

export const useUIStore = create<UIState>((set) => ({
  selectedDate: today,
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  insightsPeriod: '1W',
  setInsightsPeriod: (insightsPeriod) => set({ insightsPeriod }),
  currentLocation: null,
  locationStatus: 'idle',
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setLocationStatus: (locationStatus) => set({ locationStatus }),
}));
