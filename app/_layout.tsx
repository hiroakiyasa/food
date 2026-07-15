import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { asyncStoragePersister } from '@/src/lib/queryPersister';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCurrentLocationSetup } from '@/src/hooks/useCurrentLocation';
import { useProfile } from '@/src/hooks/useProfile';
import { useNotificationSetup } from '@/src/hooks/useNotifications';
import { usePurchaseSetup } from '@/src/hooks/usePurchases';
import { isGuestModeEnabled } from '@/src/lib/guestMode';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();
  const [guestModeEnabled, setGuestModeEnabled] = useState<boolean | null>(null);

  useNotificationSetup();
  usePurchaseSetup();
  useCurrentLocationSetup();

  useEffect(() => {
    let mounted = true;

    isGuestModeEnabled().then((enabled) => {
      if (mounted) {
        setGuestModeEnabled(enabled);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || guestModeEnabled === null) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      if (guestModeEnabled) return;
      // No session → send to onboarding (steps 1-3 don't require auth)
      router.replace('/auth/onboarding');
    } else if (session && inAuthGroup) {
      // Authenticated but in auth group → check onboarding status
      if (profileLoading) return;
      if (profile?.onboarding_completed) {
        router.replace('/(tabs)');
      }
      // If onboarding not completed, stay in auth group (onboarding screen)
    }
  }, [session, isLoading, segments, router, profile, profileLoading, guestModeEnabled]);

  if (isLoading || guestModeEnabled === null) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <RootLayoutNav />
    </PersistQueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen
            name="(modals)/camera"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen
            name="(modals)/meal-detail"
            options={{ presentation: 'modal', title: '食事詳細' }}
          />
          <Stack.Screen
            name="(modals)/barcode"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen
            name="(modals)/premium"
            options={{ presentation: 'modal', title: 'Premiumサービス' }}
          />
          <Stack.Screen
            name="(modals)/recovery-plan"
            options={{ presentation: 'modal', title: 'リカバリープラン' }}
          />
          <Stack.Screen
            name="(modals)/edit-profile"
            options={{ presentation: 'modal', title: 'プロフィール編集' }}
          />
          <Stack.Screen
            name="(modals)/edit-diseases"
            options={{ presentation: 'modal', title: '疾患プロファイル' }}
          />
          <Stack.Screen
            name="(modals)/edit-taste"
            options={{ presentation: 'modal', title: '味覚嗜好' }}
          />
          <Stack.Screen
            name="(modals)/healthkit-settings"
            options={{ presentation: 'modal', title: 'HealthKit連携' }}
          />
          <Stack.Screen
            name="(modals)/notification-settings"
            options={{ presentation: 'modal', title: '通知設定' }}
          />
          <Stack.Screen
            name="(modals)/food-search"
            options={{ presentation: 'modal', title: '食品を検索' }}
          />
          <Stack.Screen
            name="(modals)/chat-meal"
            options={{ presentation: 'modal', title: 'AIチャットで記録' }}
          />
          <Stack.Screen
            name="(modals)/nutrition-balance"
            options={{ presentation: 'modal', title: '栄養バランス' }}
          />
          <Stack.Screen
            name="(modals)/health-checkup"
            options={{ presentation: 'modal', title: '健診結果' }}
          />
          <Stack.Screen
            name="(modals)/edit-nutrition-targets"
            options={{ presentation: 'modal', title: '栄養目標' }}
          />
          <Stack.Screen
            name="(modals)/condition-select"
            options={{ presentation: 'modal', title: '栄養管理条件' }}
          />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  );
}
