import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_MODE_KEY = 'GUEST_MODE_ENABLED';

export async function isGuestModeEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setGuestModeEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(GUEST_MODE_KEY, '1');
    return;
  }
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
}
