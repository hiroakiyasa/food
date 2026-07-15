import { ScrollView, StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile } from '@/src/hooks/useProfile';
import { signOut } from '@/src/lib/auth';
import { useExportMeals } from '@/src/hooks/useExport';
import { useNutritionTargets } from '@/src/hooks/useNutritionTargets';
import { useActiveConditions } from '@/src/hooks/useActiveConditions';
import { useFastingStore } from '@/src/stores/fastingStore';
import { useCycleStore } from '@/src/stores/cycleStore';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

interface SettingsItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  isDark: boolean;
  isPremium?: boolean;
  isLast?: boolean;
  icon: keyof typeof FontAwesome.glyphMap;
  iconColor?: string;
}

function SettingsItem({
  label, value, onPress, isDark, isPremium, isLast, icon, iconColor = palette.primary,
}: SettingsItemProps) {
  const c = useThemeColors(isDark);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed: p }) => [
        styles.settingsItem,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
        pressed(p),
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.itemIcon, { backgroundColor: `${iconColor}1A` }]}>
          <FontAwesome name={icon} size={17} color={iconColor} />
        </View>
        <View style={styles.settingsLabelRow}>
          <Text style={[typography.bodyBold, { color: c.text }]}>{label}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {value && (
          <Text style={[typography.caption1, { color: c.textMuted }]}>{value}</Text>
        )}
        {onPress && <Text style={{ color: c.textMuted, fontSize: 16 }}>›</Text>}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: profile } = useProfile();
  const exportMeals = useExportMeals();
  const { data: nutritionTargets } = useNutritionTargets();
  const { activeConditions } = useActiveConditions();
  const fastingProtocol = useFastingStore((s) => s.selectedProtocol);
  const fastingEnabled = useFastingStore((s) => s.isEnabled);
  const cycleEnabled = useCycleStore((s) => s.isEnabled);

  const handleExport = () => {
    if (!profile?.is_premium) {
      router.push('/(modals)/premium' as never);
      return;
    }
    Alert.alert('データエクスポート', 'エクスポート期間を選択してください', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '1ヶ月', onPress: () => exportMeals.mutate(1) },
      { text: '3ヶ月', onPress: () => exportMeals.mutate(3) },
      { text: '全期間', onPress: () => exportMeals.mutate(undefined) },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  // Profile summary card data
  const initials = (profile?.display_name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const conditionPreview = activeConditions.slice(0, 2).join('・') +
    (activeConditions.length > 2 ? ` 他${activeConditions.length - 2}件` : '');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile summary card */}
      <View style={[styles.profileCard, { backgroundColor: c.surface }, shadow.md]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[typography.title2, { color: c.text }]}>
            {profile?.display_name ?? 'ユーザー'}
          </Text>
          <View style={styles.planBadgeRow}>
            <View style={[styles.planBadge, { backgroundColor: profile?.is_premium ? palette.warning : c.surfaceAlt }]}>
              <Text style={[styles.planBadgeText, { color: profile?.is_premium ? palette.white : c.textSecondary }]}>
                {profile?.is_premium ? '⭐ Premium' : 'Free'}
              </Text>
            </View>
            {profile?.height_cm && profile?.weight_kg && (
              <Text style={[typography.caption1, { color: c.textMuted }]}>
                {profile.height_cm}cm / {profile.weight_kg}kg
              </Text>
            )}
          </View>
        </View>
        <FontAwesome name="pencil" size={16} color={palette.primary} />
      </View>

      {/* Profile */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>PROFILE</Text>
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }]}>
        <SettingsItem
          label="表示名"
          icon="user"
          value={profile?.display_name ?? '未設定'}
          isDark={isDark}
          onPress={() => router.push('/(modals)/edit-profile' as never)}
        />
        <SettingsItem
          label="身長・体重"
          icon="heartbeat"
          iconColor={palette.berry}
          value={
            profile?.height_cm && profile?.weight_kg
              ? `${profile.height_cm}cm / ${profile.weight_kg}kg`
              : '未設定'
          }
          isDark={isDark}
          onPress={() => router.push('/(modals)/edit-profile' as never)}
        />
        <SettingsItem
          label="活動レベル"
          icon="line-chart"
          iconColor={palette.apricot}
          value={profile?.activity_level ?? '未設定'}
          isDark={isDark}
          onPress={() => router.push('/(modals)/edit-profile' as never)}
          isLast
        />
      </View>

      {/* Health */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>HEALTH</Text>
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }]}>
        <SettingsItem
          label="疾患プロファイル"
          icon="medkit"
          iconColor={palette.berry}
          isDark={isDark}
          onPress={() => router.push('/(modals)/edit-diseases' as never)}
        />
        <SettingsItem
          label="栄養管理条件"
          icon="sliders"
          value={activeConditions.length > 0 ? conditionPreview : '未設定'}
          isDark={isDark}
          onPress={() => router.push('/(modals)/condition-select' as never)}
        />
        <SettingsItem
          label="味覚嗜好"
          icon="cutlery"
          iconColor={palette.apricot}
          isDark={isDark}
          onPress={() => router.push('/(modals)/edit-taste' as never)}
        />
        <SettingsItem
          label="栄養目標"
          icon="bullseye"
          iconColor={palette.sky}
          value={nutritionTargets ? `${nutritionTargets.energy_kcal}kcal` : '未設定'}
          isDark={isDark}
          onPress={() => router.push('/(modals)/edit-nutrition-targets' as never)}
        />
        <SettingsItem
          label="健診結果"
          icon="file-text-o"
          iconColor={palette.berry}
          isDark={isDark}
          isPremium
          onPress={() => {
            if (!profile?.is_premium) {
              router.push('/(modals)/premium' as never);
              return;
            }
            router.push('/(modals)/health-checkup' as never);
          }}
        />
        <SettingsItem
          label="HealthKit連携"
          icon="heart"
          iconColor={palette.berry}
          isDark={isDark}
          onPress={() => router.push('/(modals)/healthkit-settings' as never)}
        />
        <SettingsItem
          label="通知設定"
          icon="bell"
          iconColor={palette.lemon}
          isDark={isDark}
          onPress={() => router.push('/(modals)/notification-settings' as never)}
        />
        <SettingsItem
          label="時間制限食 (TRE)"
          icon="clock-o"
          iconColor={palette.apricot}
          value={fastingEnabled ? fastingProtocol : 'オフ'}
          isDark={isDark}
          onPress={() => router.push('/(modals)/fasting-setup' as never)}
        />
        <SettingsItem
          label="月経周期"
          icon="calendar"
          iconColor={palette.berry}
          value={cycleEnabled ? 'オン' : 'オフ'}
          isDark={isDark}
          onPress={() => router.push('/(modals)/cycle-setup' as never)}
          isLast
        />
      </View>

      {/* AI Features */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>AI FEATURES</Text>
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }]}>
        <SettingsItem
          label="AI週間食事プラン"
          icon="magic"
          iconColor={palette.sky}
          isDark={isDark}
          onPress={() => router.push('/(modals)/meal-plan' as never)}
          isLast
        />
      </View>

      {/* Plan */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>PLAN</Text>
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }]}>
        <SettingsItem
          label="現在のプラン"
          icon="star"
          iconColor={palette.lemon}
          value={profile?.is_premium ? 'Premium' : 'Free'}
          isDark={isDark}
        />
        {!profile?.is_premium && (
          <SettingsItem
            label="Premium にアップグレード"
            icon="diamond"
            iconColor={palette.apricot}
            isDark={isDark}
            onPress={() => router.push('/(modals)/premium' as never)}
          />
        )}
        <SettingsItem
          label="データエクスポート"
          icon="download"
          iconColor={palette.sky}
          isDark={isDark}
          isPremium
          onPress={handleExport}
          isLast
        />
      </View>

      {/* Sign Out */}
      <Pressable
        onPress={handleSignOut}
        style={({ pressed: p }) => [styles.signOutButton, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel="ログアウト"
      >
        <Text style={styles.signOutText}>ログアウト</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { ...commonStyles.sectionHeader },

  // Profile summary card
  profileCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: palette.white,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  planBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 60,
  },
  settingsItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  settingsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  settingsItemRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    backgroundColor: palette.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: { fontSize: 9, color: palette.white, fontWeight: '700', letterSpacing: 0.5 },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: spacing.sm,
  },
  signOutText: { ...typography.bodyBold, color: palette.error },
});
