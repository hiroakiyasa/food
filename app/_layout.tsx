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
import { useProfile } from '@/src/hooks/useProfile';
import { useNotificationSetup, useNotificationPreferences } from '@/src/hooks/useNotifications';
import { usePurchaseSetup } from '@/src/hooks/usePurchases';
import { isGuestModeEnabled } from '@/src/lib/guestMode';
import { clearAllLocalData } from '@/src/lib/localDb';
import { supabase } from '@/src/lib/supabase';
import { useFastingStore } from '@/src/stores/fastingStore';
import { useCycleStore } from '@/src/stores/cycleStore';
import { useChatStore } from '@/src/stores/chatStore';
import { palette } from '@/src/lib/theme';

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
  // Keep reminder schedules in sync app-wide, not only while the
  // notification-settings screen is mounted.
  useNotificationPreferences();
  usePurchaseSetup();

  // Drop all cached user data (memory + persisted) when the session ends so a
  // later sign-in with a different account never sees the previous user's data.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        asyncStoragePersister.removeClient();
        clearAllLocalData().catch(() => {});
        useFastingStore.getState().reset();
        useCycleStore.getState().reset();
        useChatStore.getState().resetChat();
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

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
  const isDark = colorScheme === 'dark';
  const navigationTheme = isDark
    ? DarkTheme
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: palette.primary,
          background: palette.cream,
          card: palette.cream,
          text: palette.ink,
          border: '#E9E5D8',
          notification: palette.apricot,
        },
      };

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthGate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: isDark ? '#0F172A' : palette.cream },
            headerTintColor: isDark ? '#F1F5F9' : palette.ink,
            headerTitleStyle: { fontSize: 19, fontWeight: '800' },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: isDark ? '#0F172A' : palette.cream },
          }}
        >
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
          <Stack.Screen
            name="(modals)/meal-plan"
            options={{ presentation: 'modal', title: '週間食事プラン' }}
          />
          <Stack.Screen
            name="(modals)/recipe-import"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="(modals)/fasting-setup"
            options={{ presentation: 'modal', title: '食事時間の設定' }}
          />
          <Stack.Screen
            name="(modals)/cycle-setup"
            options={{ presentation: 'modal', title: '月経周期と栄養' }}
          />
          <Stack.Screen
            name="(modals)/legal"
            options={{ presentation: 'modal', title: '利用規約' }}
          />
          <Stack.Screen
            name="(modals)/weight-log"
            options={{ presentation: 'modal', title: '体重を記録' }}
          />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  );
}
