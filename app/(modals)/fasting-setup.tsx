import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useFasting } from '@/src/hooks/useFasting';
import { useProfile } from '@/src/hooks/useProfile';
import {
  FASTING_PROTOCOLS,
  type FastingProtocol,
  type FastingProtocolConfig,
} from '@/src/services/fasting/fastingEngine';
import {
  palette, typography, spacing, radius, shadow, pressed, useThemeColors,
} from '@/src/lib/theme';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初心者向け',
  intermediate: '中級者向け',
  advanced: '上級者向け',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: palette.success,
  intermediate: palette.warning,
  advanced: palette.error,
};

const EAT_START_OPTIONS = [
  { label: '8:00', value: 8 },
  { label: '9:00', value: 9 },
  { label: '10:00', value: 10 },
  { label: '11:00', value: 11 },
  { label: '12:00', value: 12 },
  { label: '13:00', value: 13 },
  { label: '14:00', value: 14 },
];

export default function FastingSetupModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: profile } = useProfile();

  // Fasting is unsafe for growing minors — block it entirely under 18.
  const isMinor = (() => {
    if (!profile?.birth_date) return false;
    const birth = new Date(profile.birth_date);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const beforeBirthday =
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age < 18;
  })();

  const {
    selectedProtocol,
    eatStartHour,
    setProtocol,
    setEatStartHour,
    startFasting,
  } = useFasting();

  const [localProtocol, setLocalProtocol] = useState<FastingProtocol>(selectedProtocol);
  const [localEatStart, setLocalEatStart] = useState(eatStartHour);

  const selectedConfig = FASTING_PROTOCOLS.find((p) => p.id === localProtocol)!;
  const eatEndHour = localEatStart + selectedConfig.eatHours;
  const fastEndHour = localEatStart; // 断食終了=食事開始
  const fastStartHour = (fastEndHour - selectedConfig.fastHours + 24) % 24;

  const handleStart = () => {
    setProtocol(localProtocol);
    setEatStartHour(localEatStart);
    startFasting(localProtocol, localEatStart);
    router.dismiss();
  };

  if (isMinor) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title1, { color: c.text, marginBottom: spacing.md }]}>
          時間制限食の設定
        </Text>
        <View style={[styles.cautionBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[typography.bodyBold, { color: c.text, marginBottom: spacing.xs }]}>
            18歳未満の方はご利用いただけません
          </Text>
          <Text style={[typography.caption1, styles.cautionText, { color: c.textSecondary }]}>
            成長期には規則正しく十分な食事をとることが大切です。時間制限食（断食）は成長に必要な栄養が不足するおそれがあるため、この機能は提供していません。食事について気になることがあれば、保護者や医師にご相談ください。
          </Text>
        </View>
        <Pressable
          onPress={() => router.dismiss()}
          style={({ pressed: p }) => [styles.cancelButton, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={[typography.body, { color: c.textSecondary }]}>閉じる</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Handle */}
      <View style={[styles.handle, { backgroundColor: c.border }]} />

      <Text style={[typography.title1, { color: c.text, marginBottom: spacing.xs }]}>
        時間制限食の設定
      </Text>
      <Text style={[typography.body, { color: c.textSecondary, marginBottom: spacing.xl }]}>
        プロトコルと食事ウィンドウを選択してください
      </Text>

      {/* Protocol selection */}
      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>プロトコル</Text>
      {FASTING_PROTOCOLS.map((config) => {
        const isSelected = localProtocol === config.id;
        return (
          <Pressable
            key={config.id}
            onPress={() => setLocalProtocol(config.id)}
            style={({ pressed: p }) => [
              styles.protocolCard,
              { backgroundColor: c.surface, borderColor: isSelected ? palette.primary : c.border },
              isSelected && styles.protocolCardSelected,
              shadow.sm,
              pressed(p),
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.protocolHeader}>
              <View style={styles.protocolLeft}>
                <Text style={styles.protocolEmoji}>{config.emoji}</Text>
                <View>
                  <Text style={[typography.bodyBold, { color: c.text }]}>{config.label}</Text>
                  <View style={styles.difficultyTag}>
                    <View
                      style={[
                        styles.difficultyDot,
                        { backgroundColor: DIFFICULTY_COLORS[config.difficulty] },
                      ]}
                    />
                    <Text style={[typography.caption2, { color: DIFFICULTY_COLORS[config.difficulty] }]}>
                      {DIFFICULTY_LABELS[config.difficulty]}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[
                styles.radioCircle,
                { borderColor: isSelected ? palette.primary : c.border },
              ]}>
                {isSelected && <View style={[styles.radioDot, { backgroundColor: palette.primary }]} />}
              </View>
            </View>
            <Text style={[typography.caption1, { color: c.textSecondary, marginTop: spacing.sm }]}>
              {config.description}
            </Text>
            <View style={styles.protocolTimes}>
              <View style={[styles.timeBadge, { backgroundColor: '#0F172A22' }]}>
                <Text style={[typography.caption2, { color: c.text, fontWeight: '700' }]}>
                  断食 {config.fastHours}h
                </Text>
              </View>
              <Text style={[typography.caption2, { color: c.textMuted }]}>+</Text>
              <View style={[styles.timeBadge, { backgroundColor: palette.primaryMuted }]}>
                <Text style={[typography.caption2, { color: palette.primary, fontWeight: '700' }]}>
                  食事 {config.eatHours}h
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      {/* Eat window start */}
      {localProtocol !== '5:2' && (
        <>
          <Text style={[styles.sectionLabel, { color: c.textMuted, marginTop: spacing.xl }]}>
            食事ウィンドウ開始時刻
          </Text>
          <View style={styles.hourGrid}>
            {EAT_START_OPTIONS.map((opt) => {
              const isSelected = localEatStart === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setLocalEatStart(opt.value)}
                  style={({ pressed: p }) => [
                    styles.hourChip,
                    {
                      backgroundColor: isSelected ? palette.primary : c.surface,
                      borderColor: isSelected ? palette.primary : c.border,
                    },
                    pressed(p),
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[
                    typography.caption1,
                    { color: isSelected ? palette.white : c.text, fontWeight: '600' },
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Schedule preview */}
      {localProtocol !== '5:2' && (
        <View style={[styles.preview, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted, marginBottom: spacing.sm }]}>
            スケジュールプレビュー
          </Text>
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: '#66766F' }]} />
            <Text style={[typography.body, { color: c.text }]}>
              断食開始{' '}
              <Text style={{ fontWeight: '700' }}>
                {String(fastStartHour).padStart(2, '0')}:00
              </Text>
            </Text>
          </View>
          <View style={[styles.previewLine, { backgroundColor: c.border }]} />
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: palette.primary }]} />
            <Text style={[typography.body, { color: c.text }]}>
              食事ウィンドウ開始{' '}
              <Text style={{ fontWeight: '700', color: palette.primary }}>
                {String(localEatStart).padStart(2, '0')}:00
              </Text>
            </Text>
          </View>
          <View style={[styles.previewLine, { backgroundColor: c.border }]} />
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: palette.accent }]} />
            <Text style={[typography.body, { color: c.text }]}>
              食事ウィンドウ終了{' '}
              <Text style={{ fontWeight: '700', color: palette.accent }}>
                {String(eatEndHour % 24).padStart(2, '0')}:00
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* Safety notice */}
      <View style={[styles.cautionBox, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[typography.bodyBold, { color: c.text, marginBottom: spacing.xs }]}>
          はじめる前にご確認ください
        </Text>
        <Text style={[typography.caption1, styles.cautionText, { color: c.textSecondary }]}>
          時間制限食はすべての方に適した方法ではありません。妊娠中・授乳中の方、糖尿病などで治療中の方、摂食障害の既往がある方、18歳未満の方にはおすすめできません。実施前に医師にご相談ください。体調に異変を感じたときは、時間にかかわらずすぐに食事をとり、無理をしないでください。
        </Text>
      </View>

      {/* Start button */}
      <Pressable
        onPress={handleStart}
        style={({ pressed: p }) => [styles.startButton, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel="断食を開始する"
      >
        <Text style={styles.startButtonText}>断食を開始する</Text>
      </Pressable>

      <Pressable
        onPress={() => router.dismiss()}
        style={({ pressed: p }) => [styles.cancelButton, pressed(p)]}
        accessibilityRole="button"
        accessibilityLabel="キャンセル"
      >
        <Text style={[typography.body, { color: c.textSecondary }]}>キャンセル</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.xl,
    paddingBottom: 48,
  },
  cautionBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  cautionText: {
    lineHeight: 19,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.md,
  },
  protocolCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  protocolCardSelected: {
    borderWidth: 2,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  protocolLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  protocolEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  difficultyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  protocolTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  timeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  hourChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    minWidth: 68,
    alignItems: 'center',
  },
  preview: {
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewLine: {
    width: 2,
    height: 20,
    marginLeft: 4,
  },
  startButton: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.colored(palette.primary),
  },
  startButtonText: {
    color: palette.white,
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
