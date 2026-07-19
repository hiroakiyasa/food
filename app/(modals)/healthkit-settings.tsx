import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useHealthStore } from '@/src/stores/healthStore';
import { addDays, getToday } from '@/src/utils/formatters';
import { useHealthSync, useHealthConnection } from '@/src/hooks/useHealthSync';
import { useHealthDataRange } from '@/src/hooks/useHealthData';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

function formatSyncTime(isoDate: string | null): string {
  if (!isoDate) return '未同期';
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}時間前`;
  return d.toLocaleDateString('ja-JP');
}

export default function HealthKitSettingsModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { isConnected, lastSyncAt, isSyncing } = useHealthStore();
  const { connect, disconnect } = useHealthConnection();
  const syncMutation = useHealthSync();
  const today = getToday();
  const weekAgo = addDays(today, -7);
  const { data: healthData } = useHealthDataRange(weekAgo, today);

  const latestData = healthData?.[healthData.length - 1];

  const handleConnect = async () => {
    const success = await connect();
    if (success) {
      syncMutation.mutate();
      return;
    }
    Alert.alert(
      '連携できませんでした',
      Platform.OS === 'ios'
        ? 'ヘルスケアへのアクセスが許可されていない可能性があります。設定アプリの「ヘルスケア」からアクセスを許可してください。'
        : 'ヘルスコネクトへのアクセスが許可されていない可能性があります。ヘルスコネクトの設定からアクセスを許可してください。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '設定を開く', onPress: () => Linking.openSettings() },
      ],
    );
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const statusColor = isSyncing
    ? palette.warning
    : isConnected
      ? palette.success
      : c.textMuted;

  const statusLabel = isSyncing
    ? '同期中'
    : isConnected
      ? '接続中'
      : '未接続';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[commonStyles.card, { backgroundColor: c.surface }]}>
        <Text style={[typography.title2, { color: c.text, marginBottom: spacing.sm }]}>
          HealthKit連携
        </Text>
        <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing.xl }]}>
          Apple HealthKitと連携して、歩数・心拍数・睡眠データを自動取得できます。
        </Text>

        {/* Connection Status */}
        <View style={[styles.statusRow, { borderColor: c.divider }]}>
          <Text style={[typography.body, { color: c.text }]}>接続状態</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[typography.caption1, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Last Sync */}
        <View style={[styles.statusRow, { borderColor: c.divider }]}>
          <Text style={[typography.body, { color: c.text }]}>最終同期</Text>
          <Text style={[typography.caption1, { color: c.textMuted }]}>
            {formatSyncTime(lastSyncAt)}
          </Text>
        </View>

        {/* Data Preview */}
        {isConnected && latestData && (
          <View style={styles.dataPreview}>
            <Text style={[styles.previewTitle, { color: c.textSecondary }]}>最新データ</Text>
            <View style={styles.previewGrid}>
              {latestData.steps != null && (
                <View style={[styles.previewItem, { backgroundColor: c.surfaceAlt }]}>
                  <Text style={[typography.numberSmall, { color: c.text }]}>
                    {latestData.steps.toLocaleString()}
                  </Text>
                  <Text style={[typography.caption2, { color: c.textMuted }]}>歩数</Text>
                </View>
              )}
              {latestData.resting_heart_rate != null && (
                <View style={[styles.previewItem, { backgroundColor: c.surfaceAlt }]}>
                  <Text style={[typography.numberSmall, { color: c.text }]}>
                    {latestData.resting_heart_rate}
                  </Text>
                  <Text style={[typography.caption2, { color: c.textMuted }]}>安静時心拍</Text>
                </View>
              )}
              {latestData.sleep_hours != null && (
                <View style={[styles.previewItem, { backgroundColor: c.surfaceAlt }]}>
                  <Text style={[typography.numberSmall, { color: c.text }]}>
                    {latestData.sleep_hours.toFixed(1)}h
                  </Text>
                  <Text style={[typography.caption2, { color: c.textMuted }]}>睡眠</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!isConnected ? (
        <Pressable
          onPress={handleConnect}
          style={({ pressed: p }) => [commonStyles.buttonPrimary, { marginTop: spacing.xl }, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="接続する"
        >
          <Text style={commonStyles.buttonText}>接続する</Text>
        </Pressable>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Pressable
            onPress={() => syncMutation.mutate()}
            disabled={isSyncing}
            style={({ pressed: p }) => [commonStyles.buttonPrimary, pressed(p), isSyncing && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="今すぐ同期"
          >
            {isSyncing ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={commonStyles.buttonText}>今すぐ同期</Text>
            )}
          </Pressable>
          <Pressable
            onPress={handleDisconnect}
            style={({ pressed: p }) => [commonStyles.buttonDestructive, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="接続を解除"
          >
            <Text style={[commonStyles.buttonText, { color: palette.error }]}>接続を解除</Text>
          </Pressable>
        </View>
      )}

      <Text style={[typography.caption1, { color: c.textMuted, textAlign: 'center', marginTop: spacing.xl }]}>
        取得したヘルスケアデータは、栄養提案と分析の表示にのみ使用します。{'\n'}
        広告目的で利用したり、第三者へ提供することはありません。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dataPreview: { marginTop: spacing.lg },
  previewTitle: { ...typography.caption1, marginBottom: spacing.sm },
  previewGrid: { flexDirection: 'row', gap: spacing.sm },
  previewItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    gap: 4,
  },
});
