import { useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useProfile } from '@/src/hooks/useProfile';
import { useOfferings, usePurchase, useRestorePurchases, type PlanType } from '@/src/hooks/usePurchases';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';

interface FeatureRow {
  label: string;
  free: boolean;
  premium: boolean;
}

interface FeatureCategory {
  title: string;
  color: string;
  features: FeatureRow[];
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: '基本機能（ずっと無料）',
    color: palette.primary,
    features: [
      { label: 'AI画像解析（カロリー・PFC）', free: true, premium: true },
      { label: 'バーコードスキャン', free: true, premium: true },
      { label: 'デイリースコア＆フィードバック', free: true, premium: true },
      { label: '栄養バランスガーデン', free: true, premium: true },
      { label: 'HealthKit / ヘルスコネクト連携', free: true, premium: true },
      { label: '疾患・条件に合わせた栄養目標', free: true, premium: true },
    ],
  },
  {
    title: 'AIパーソナル機能',
    color: palette.warning,
    features: [
      { label: 'AI週間食事プラン＆買い物リスト', free: false, premium: true },
      { label: 'リカバリープラン（食べすぎ調整）', free: false, premium: true },
      { label: '健診結果のAI読み取り＆アドバイス', free: false, premium: true },
    ],
  },
  {
    title: '記録とデータ',
    color: palette.sky,
    features: [
      { label: 'MYレシピ登録（URL取り込み）', free: false, premium: true },
      { label: 'データエクスポート（CSV）', free: false, premium: true },
    ],
  },
];

export default function PremiumModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: profile } = useProfile();
  const isPremium = profile?.is_premium ?? false;

  const { data: offerings, isLoading: offeringsLoading } = useOfferings();
  const purchase = usePurchase();
  const restore = useRestorePurchases();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('half_yearly');

  const monthlyPackage = offerings?.current?.monthly ?? null;
  const halfYearlyPackage = offerings?.current?.sixMonth ?? null;
  const offeringsReady = monthlyPackage != null && halfYearlyPackage != null;

  const monthlyPrice = monthlyPackage?.product.priceString ?? '—';
  const halfYearlyPrice = halfYearlyPackage?.product.priceString ?? '—';

  // Compute the savings claim from real store prices only (never hardcode).
  const savingsLabel = (() => {
    const monthly = monthlyPackage?.product.price;
    const halfYearly = halfYearlyPackage?.product.price;
    if (!monthly || !halfYearly) return null;
    const perMonth = halfYearly / 6;
    const percent = Math.round((1 - perMonth / monthly) * 100);
    if (percent <= 0) return null;
    return `月あたり¥${Math.round(perMonth).toLocaleString()}（${percent}%お得）`;
  })();

  const handlePurchase = async () => {
    try {
      const info = await purchase.mutateAsync(selectedPlan);
      if (info) {
        Alert.alert('Premiumに登録されました', 'すべての機能をお楽しみください', [
          { text: 'OK', onPress: () => router.dismiss() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message ?? '購入処理中にエラーが発生しました');
    }
  };

  const handleRestore = async () => {
    try {
      await restore.mutateAsync();
      Alert.alert('復元完了', '購入情報を復元しました');
    } catch {
      Alert.alert('エラー', '購入の復元に失敗しました');
    }
  };

  const isLoading = purchase.isPending || restore.isPending;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.premiumIcon}>
          <Text style={styles.premiumIconText}>P</Text>
        </View>
        <Text style={[typography.title1, { color: c.text }]}>
          Premium
        </Text>
        <Text style={[typography.body, { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
          あなたの健康をもっとサポートする機能が使えます
        </Text>
      </View>

      {/* Comparison Table */}
      <View style={[styles.table, { backgroundColor: c.surface }, shadow.md]}>
        {/* Column Headers */}
        <View style={[styles.columnHeaders, { borderBottomColor: c.divider }]}>
          <View style={styles.featureLabelCol} />
          <View style={styles.planCol}>
            <Text style={[typography.caption2, { color: c.textMuted }]}>Free</Text>
          </View>
          <View style={[styles.planCol, styles.premiumCol]}>
            <View style={styles.premiumColIcon}>
              <Text style={styles.premiumColIconText}>P</Text>
            </View>
            <Text style={[typography.caption2, { color: palette.warning, fontWeight: '700' }]}>
              Premium
            </Text>
          </View>
        </View>

        {/* Feature Categories */}
        {FEATURE_CATEGORIES.map((category) => (
          <View key={category.title}>
            <View style={[styles.categoryHeader, { borderBottomColor: c.divider }]}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={[typography.caption1, { color: category.color, fontWeight: '700' }]}>
                {category.title}
              </Text>
            </View>
            {category.features.map((feature) => (
              <View
                key={feature.label}
                style={[styles.featureRow, { borderBottomColor: c.borderLight }]}
              >
                <View style={styles.featureLabelCol}>
                  <Text style={[typography.caption1, { color: c.text, fontWeight: '400' }]}>
                    {feature.label}
                  </Text>
                </View>
                <View style={styles.planCol}>
                  {feature.free ? (
                    <View style={styles.checkIcon}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  ) : (
                    <View style={[styles.lockDot, { backgroundColor: c.surfaceAlt }]}>
                      <Text style={[typography.caption2, { color: c.textMuted }]}>--</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.planCol, { backgroundColor: palette.warning + '05' }]}>
                  <View style={styles.checkIcon}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Pricing Section */}
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginTop: spacing.xl }]}>
        <View style={styles.priceRow}>
          <Pressable
            style={({ pressed: p }) => [
              styles.priceOption,
              { borderColor: selectedPlan === 'monthly' ? palette.warning : c.border },
              selectedPlan === 'monthly' && { borderWidth: 2 },
              pressed(p),
            ]}
            onPress={() => setSelectedPlan('monthly')}
            accessibilityRole="button"
            accessibilityLabel={`月額プラン ${monthlyPrice}`}
          >
            <Text style={[typography.caption1, { color: c.textSecondary }]}>月額プラン</Text>
            <Text style={[typography.title1, { color: c.text }]}>
              {monthlyPrice}<Text style={[typography.caption1, { color: c.textMuted }]}>/月</Text>
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed: p }) => [
              styles.priceOption,
              { borderColor: selectedPlan === 'half_yearly' ? palette.warning : c.border },
              selectedPlan === 'half_yearly' && styles.priceOptionRecommended,
              pressed(p),
            ]}
            onPress={() => setSelectedPlan('half_yearly')}
            accessibilityRole="button"
            accessibilityLabel={`半年プラン ${halfYearlyPrice} おすすめ`}
          >
            <View style={styles.recommendedBadge}>
              <Text style={[typography.caption2, { color: palette.white, fontWeight: '700' }]}>
                おすすめ
              </Text>
            </View>
            <Text style={[typography.caption1, { color: c.textSecondary }]}>半年プラン</Text>
            <Text style={[typography.title1, { color: c.text }]}>
              {halfYearlyPrice}<Text style={[typography.caption1, { color: c.textMuted }]}>/半年</Text>
            </Text>
            {savingsLabel && (
              <Text style={[typography.caption2, { color: palette.warning, marginTop: spacing.xs }]}>
                {savingsLabel}
              </Text>
            )}
          </Pressable>
        </View>
        {!offeringsReady && (
          <Text
            style={[
              typography.caption1,
              { color: c.textMuted, textAlign: 'center', marginTop: spacing.md },
            ]}
          >
            {offeringsLoading
              ? '価格情報を取得しています…'
              : '価格情報を取得できませんでした。通信環境をご確認のうえ、しばらくしてから再度お開きください。'}
          </Text>
        )}
      </View>

      {/* CTA Button */}
      {!isPremium && (
        <Pressable
          style={({ pressed: p }) => [
            styles.ctaButton,
            pressed(p),
            (isLoading || !offeringsReady) && { opacity: 0.6 },
          ]}
          onPress={handlePurchase}
          disabled={isLoading || !offeringsReady}
          accessibilityRole="button"
          accessibilityLabel={selectedPlan === 'half_yearly' ? '半年プランに登録する' : '月額プランに登録する'}
        >
          {isLoading ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={[commonStyles.buttonText, { fontSize: 18 }]}>
              {selectedPlan === 'half_yearly' ? '半年プランに登録する' : '月額プランに登録する'}
            </Text>
          )}
        </Pressable>
      )}

      {/* Auto-renewal disclosure (App Store Review Guideline 3.1.2) */}
      {!isPremium && (
        <Text style={[typography.caption2, styles.disclosureText, { color: c.textMuted }]}>
          Premiumは自動更新サブスクリプションです。期間終了の24時間以上前に解約しない限り、選択したプランの料金で自動更新されます。購入確定時にApp Store / Google Playアカウントに課金され、解約はOSのサブスクリプション設定からいつでも行えます。
        </Text>
      )}

      {isPremium && (
        <View style={[commonStyles.buttonPrimary, { marginTop: spacing.xl }]}>
          <Text style={commonStyles.buttonText}>現在Premiumをご利用中です</Text>
        </View>
      )}

      {/* Footer links */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed: p }) => [pressed(p)]}
          onPress={handleRestore}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="購入を復元する"
        >
          <Text style={[typography.caption2, { color: c.textMuted }]}>購入を復元する</Text>
        </Pressable>
        <Pressable
          style={({ pressed: p }) => [styles.footerLink, pressed(p)]}
          onPress={() => router.push({ pathname: '/(modals)/legal', params: { doc: 'terms' } } as never)}
          accessibilityRole="button"
          accessibilityLabel="利用規約"
        >
          <Text style={[typography.caption2, { color: c.textMuted }]}>利用規約</Text>
        </Pressable>
        <Pressable
          style={({ pressed: p }) => [styles.footerLink, pressed(p)]}
          onPress={() => router.push({ pathname: '/(modals)/legal', params: { doc: 'privacy' } } as never)}
          accessibilityRole="button"
          accessibilityLabel="プライバシーポリシー"
        >
          <Text style={[typography.caption2, { color: c.textMuted }]}>プライバシーポリシー</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  premiumIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.colored(palette.warning),
  },
  premiumIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.white,
  },
  table: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  featureLabelCol: { flex: 1 },
  planCol: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCol: {
    flexDirection: 'column',
    gap: 2,
  },
  premiumColIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumColIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.white,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: palette.white, fontSize: 13, fontWeight: '700' },
  lockDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceOption: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceOptionRecommended: {
    borderColor: palette.warning,
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: palette.warning,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  ctaButton: {
    backgroundColor: palette.warning,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    minHeight: 52,
    justifyContent: 'center',
    ...shadow.colored(palette.warning),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  footerLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  disclosureText: {
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
