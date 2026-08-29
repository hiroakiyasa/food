import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { palette, colors, shadow, radius } from '@/src/lib/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

function CameraFAB() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(modals)/camera')}
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.fabPressed,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel="写真で食事を記録"
    >
      <FontAwesome name="camera" size={24} color={palette.white} />
    </Pressable>
  );
}

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? colors.dark : colors.light;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: isDark ? '#8D9993' : '#486259',
        headerShown: true,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerTitleStyle: styles.headerTitle,
        tabBarStyle: [styles.tabBar, {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
        }],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '記録',
          headerTitle: '食事記録',
          tabBarIcon: ({ color }) => <TabBarIcon name="pencil" color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera-tab"
        options={{
          title: '',
          tabBarIcon: () => <CameraFAB />,
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: '分析',
          headerTitle: 'からだの分析',
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'マイページ',
          headerTitle: 'マイページ',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-o" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 92,
    paddingBottom: 28,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...shadow.lg,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: palette.apricot,
    borderWidth: 4,
    borderColor: '#FFF3E8',
    ...shadow.colored(palette.apricot),
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
