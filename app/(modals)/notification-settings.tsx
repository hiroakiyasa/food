import { useState } from 'react';
import {
  ScrollView, View, Text, Switch, Pressable, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useNotificationPreferences } from '@/src/hooks/useNotifications';
import { useAuthStore } from '@/src/stores/authStore';
import { registerForPushNotifications } from '@/src/services/notifications/notificationService';
import * as Notifications from 'expo-notifications';
import {
  palette, typography, spacing, radius,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

/** Parse "HH:MM" string into hours and minutes */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':');
  return {
    hours: parseInt(parts[0] ?? '0', 10),
    minutes: parseInt(parts[1] ?? '0', 10),
  };
}

/** Build all time options in HH:MM with 30-minute steps */
function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 4; h <= 23; h++) {
    for (const m of [0, 30]) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function SettingRow({
  label,
  value,
  onValueChange,
  isDark,
  isLast,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isDark: boolean;
  isLast?: boolean;
}) {
  const c = useThemeColors(isDark);
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider }]}>
      <Text style={[typography.body, { color: c.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.surfaceAlt, true: palette.primary }}
        thumbColor={palette.white}
      />
    </View>
  );
}

function TimeRow({
  label,
  time,
  onPress,
  isDark,
  isLast,
}: {
  label: string;
  time: string;
  onPress: () => void;
  isDark: boolean;
  isLast?: boolean;
}) {
  const c = useThemeColors(isDark);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
        pressed(p),
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}の時刻を変更: ${time}`}
    >
      <Text style={[typography.body, { color: c.text }]}>{label}</Text>
      <View style={styles.timeRight}>
        <Text style={[typography.body, { color: palette.primary, fontWeight: '600' }]}>{time}</Text>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>›</Text>
      </View>
    </Pressable>
  );
}

type TimeSetter = 'breakfast' | 'lunch' | 'dinner';

const TARGET_LABELS: Record<TimeSetter, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
};

/** Simple time picker modal using a scrollable list */
function TimePickerModal({
  visible,
  currentTime,
  label,
  isDark,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentTime: string;
  label: string;
  isDark: boolean;
  onSelect: (time: string) => void;
  onClose: () => void;
}) {
  const c = useThemeColors(isDark);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="閉じる"
      >
        <Pressable style={[styles.pickerSheet, { backgroundColor: c.surface }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[styles.handleBar, { backgroundColor: c.divider }]} />
          {/* Header */}
          <View style={styles.pickerHeader}>
            <Pressable
              onPress={onClose}
              style={({ pressed: p }) => [pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={[typography.body, { color: c.textSecondary }]}>キャンセル</Text>
            </Pressable>
            <Text style={[typography.bodyBold, { color: c.text }]}>{label}の時刻</Text>
            <View style={{ width: 60 }} />
          </View>
          {/* Options */}
          <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
            {TIME_OPTIONS.map((t) => {
              const isSelected = t === currentTime;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    onSelect(t);
                    onClose();
                  }}
                  style={({ pressed: p }) => [
                    styles.option,
                    { borderBottomColor: c.divider, borderBottomWidth: StyleSheet.hairlineWidth },
                    isSelected && { backgroundColor: palette.primaryLight },
                    pressed(p),
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={t}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[
                    typography.body,
                    { color: isSelected ? palette.primaryDark : c.text, fontWeight: isSelected ? '700' : '400' },
                  ]}>
                    {t}
                  </Text>
                  {isSelected && <Text style={{ color: palette.primary }}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NotificationSettingsModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const store = useNotificationStore();
  const user = useAuthStore((state) => state.user);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<TimeSetter>('breakfast');

  // Sync preferences with scheduled notifications
  useNotificationPreferences();

  const getCurrentTime = (target: TimeSetter): string => {
    if (target === 'breakfast') return store.breakfastTime;
    if (target === 'lunch') return store.lunchTime;
    return store.dinnerTime;
  };

  const openPicker = (target: TimeSetter) => {
    setPickerTarget(target);
    setPickerVisible(true);
  };

  const handleSelect = (time: string) => {
    if (pickerTarget === 'breakfast') store.setBreakfastTime(time);
    else if (pickerTarget === 'lunch') store.setLunchTime(time);
    else store.setDinnerTime(time);
  };

  const enableNotifications = async (onEnabled: () => void) => {
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        '通知はオフのままです',
        '通知を使う場合は、端末の設定からこのアプリの通知を許可してください。',
      );
      return;
    }
    onEnabled();
    if (user) void registerForPushNotifications(user.id);
  };

  const handleMealReminders = (enabled: boolean) => {
    if (!enabled) {
      store.setMealReminders(false);
      return;
    }
    void enableNotifications(() => store.setMealReminders(true));
  };

  const handleStreakReminders = (enabled: boolean) => {
    if (!enabled) {
      store.setStreakReminders(false);
      return;
    }
    void enableNotifications(() => store.setStreakReminders(true));
  };

  const handleBadgeNotifications = (enabled: boolean) => {
    if (!enabled) {
      store.setBadgeNotifications(false);
      return;
    }
    void enableNotifications(() => store.setBadgeNotifications(true));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Meal Reminders */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>食事リマインダー</Text>
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }]}>
        <SettingRow
          label="食事リマインダー"
          value={store.mealReminders}
          onValueChange={handleMealReminders}
          isDark={isDark}
        />
        {store.mealReminders && (
          <>
            <TimeRow
              label="朝食"
              time={store.breakfastTime}
              onPress={() => openPicker('breakfast')}
              isDark={isDark}
            />
            <TimeRow
              label="昼食"
              time={store.lunchTime}
              onPress={() => openPicker('lunch')}
              isDark={isDark}
            />
            <TimeRow
              label="夕食"
              time={store.dinnerTime}
              onPress={() => openPicker('dinner')}
              isDark={isDark}
              isLast
            />
          </>
        )}
        {!store.mealReminders && <View style={{ height: 0 }} />}
      </View>

      {/* Other Notifications */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>その他の通知</Text>
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }]}>
        <SettingRow
          label="ストリーク維持リマインダー"
          value={store.streakReminders}
          onValueChange={handleStreakReminders}
          isDark={isDark}
        />
        <SettingRow
          label="バッジ獲得通知"
          value={store.badgeNotifications}
          onValueChange={handleBadgeNotifications}
          isDark={isDark}
          isLast
        />
      </View>

      <Pressable
        onPress={() => router.dismiss()}
        style={({ pressed: p }) => [commonStyles.buttonPrimary, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel="閉じる"
      >
        <Text style={commonStyles.buttonText}>閉じる</Text>
      </Pressable>

      <TimePickerModal
        visible={pickerVisible}
        currentTime={getCurrentTime(pickerTarget)}
        label={TARGET_LABELS[pickerTarget]}
        isDark={isDark}
        onSelect={handleSelect}
        onClose={() => setPickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { ...commonStyles.sectionHeader },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 48,
  },
  timeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9E5D8',
  },
  optionList: { paddingHorizontal: spacing.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
});
