import { useState } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from '@/components/useColorScheme';
import {
  useHealthCheckups, useUploadCheckup, useGenerateCheckupAdvice,
  type CheckupAdvice,
} from '@/src/hooks/useHealthCheckup';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';
import type { Database } from '@/src/types/database';

type HealthCheckup = Database['public']['Tables']['health_checkups']['Row'];

// ─── Reference ranges ───────────────────────────────────────────────────────

type TrafficLight = 'green' | 'amber' | 'red';

function hba1cStatus(v: number): TrafficLight {
  if (v < 5.6) return 'green';
  if (v < 6.5) return 'amber';
  return 'red';
}
function glucoseStatus(v: number): TrafficLight {
  if (v < 100) return 'green';
  if (v < 126) return 'amber';
  return 'red';
}
function triglyceridesStatus(v: number): TrafficLight {
  return v < 150 ? 'green' : 'red';
}
function ldlStatus(v: number): TrafficLight {
  if (v < 120) return 'green';
  if (v < 140) return 'amber';
  return 'red';
}
function hdlStatus(v: number): TrafficLight {
  if (v >= 60) return 'green';
  if (v >= 40) return 'amber';
  return 'red';
}

const TL_COLOR: Record<TrafficLight, string> = {
  green: palette.success,
  amber: palette.warning,
  red: palette.error,
};
const TL_EMOJI: Record<TrafficLight, string> = {
  green: '🟢',
  amber: '🟡',
  red: '🔴',
};

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricChip({
  label, value, unit, status,
}: { label: string; value: number | null; unit: string; status?: TrafficLight }) {
  if (value == null) return null;
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const color = status ? TL_COLOR[status] : c.textSecondary;
  const emoji = status ? TL_EMOJI[status] : '';
  return (
    <View style={[styles.metricChip, { backgroundColor: c.surfaceAlt }]}>
      <Text style={[typography.caption1, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>
        {value}{unit}
      </Text>
      {emoji ? <Text style={styles.metricEmoji}>{emoji}</Text> : null}
    </View>
  );
}

// ─── Advice section ───────────────────────────────────────────────────────────

function AdviceSection({ advice, isDark }: { advice: CheckupAdvice; isDark: boolean }) {
  const c = useThemeColors(isDark);
  return (
    <View style={[styles.adviceContainer, { borderTopColor: c.divider }]}>
      <Text style={[typography.caption1, { color: palette.primary, fontWeight: '700', marginBottom: spacing.sm }]}>
        AIアドバイス
      </Text>
      <Text style={[typography.caption1, { color: c.text, marginBottom: spacing.md }]}>
        {advice.overall_assessment}
      </Text>
      {advice.priority_improvements.length > 0 && (
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[typography.caption2, { color: c.textMuted, marginBottom: 4 }]}>優先的な改善点</Text>
          {advice.priority_improvements.map((item, i) => (
            <Text key={i} style={[typography.caption1, { color: c.text }]}>• {item}</Text>
          ))}
        </View>
      )}
      {advice.weekly_plan_focus.length > 0 && (
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[typography.caption2, { color: c.textMuted, marginBottom: 4 }]}>今週の食事フォーカス</Text>
          {advice.weekly_plan_focus.map((item, i) => (
            <Text key={i} style={[typography.caption1, { color: c.text }]}>• {item}</Text>
          ))}
        </View>
      )}
      {advice.next_checkup_note && (
        <Text style={[typography.caption2, { color: c.textMuted, fontStyle: 'italic', marginTop: spacing.xs }]}>
          {advice.next_checkup_note}
        </Text>
      )}
    </View>
  );
}

// ─── Checkup card ─────────────────────────────────────────────────────────────

function CheckupCard({ checkup, isDark }: { checkup: HealthCheckup; isDark: boolean }) {
  const c = useThemeColors(isDark);
  const date = new Date(checkup.checkup_date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const advice = checkup.advice_json as CheckupAdvice | null;

  return (
    <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.md }, shadow.sm]}>
      <Text style={[typography.caption1, { color: c.textMuted, marginBottom: spacing.sm }]}>
        検査日: {date}
      </Text>
      <View style={styles.metricsGrid}>
        {checkup.hba1c != null && (
          <MetricChip label="HbA1c" value={checkup.hba1c} unit="%" status={hba1cStatus(checkup.hba1c)} />
        )}
        {checkup.fasting_glucose != null && (
          <MetricChip label="血糖値" value={checkup.fasting_glucose} unit="mg/dL" status={glucoseStatus(checkup.fasting_glucose)} />
        )}
        {checkup.triglycerides != null && (
          <MetricChip label="中性脂肪" value={checkup.triglycerides} unit="mg/dL" status={triglyceridesStatus(checkup.triglycerides)} />
        )}
        {checkup.ldl_cholesterol != null && (
          <MetricChip label="LDL" value={checkup.ldl_cholesterol} unit="mg/dL" status={ldlStatus(checkup.ldl_cholesterol)} />
        )}
        {checkup.hdl_cholesterol != null && (
          <MetricChip label="HDL" value={checkup.hdl_cholesterol} unit="mg/dL" status={hdlStatus(checkup.hdl_cholesterol)} />
        )}
        {checkup.bmi != null && (
          <MetricChip label="BMI" value={checkup.bmi} unit="" />
        )}
      </View>
      {(checkup.systolic_bp != null && checkup.diastolic_bp != null) && (
        <Text style={[typography.caption1, { color: c.textSecondary, marginTop: spacing.sm }]}>
          血圧: {checkup.systolic_bp}/{checkup.diastolic_bp} mmHg
        </Text>
      )}
      {advice && <AdviceSection advice={advice} isDark={isDark} />}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HealthCheckupModal() {
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const { data: checkups = [], isLoading } = useHealthCheckups();
  const upload = useUploadCheckup();
  const generateAdvice = useGenerateCheckupAdvice();
  const [analyzing, setAnalyzing] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];

    setAnalyzing(true);
    try {
      await upload.mutateAsync(asset);
    } catch (err) {
      Alert.alert('解析エラー', (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const latestCheckup = checkups[0] ?? null;
  const historyCheckups = checkups.slice(1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Upload buttons */}
      <View style={[commonStyles.card, { backgroundColor: c.surface, marginBottom: spacing.xl }, shadow.sm]}>
        <Text style={[typography.bodyBold, { color: c.text, marginBottom: spacing.md }]}>
          健診結果を取り込む
        </Text>
        <Text style={[typography.caption1, { color: c.textMuted, marginBottom: spacing.lg }]}>
          健診結果の用紙や画面を撮影すると、AIが数値を自動で読み取ります
        </Text>

        {analyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={[typography.body, { color: c.textSecondary, marginTop: spacing.md }]}>
              解析中...
            </Text>
          </View>
        ) : (
          <View style={styles.uploadButtons}>
            <Pressable
              onPress={() => pickImage(true)}
              style={({ pressed: p }) => [
                styles.uploadButton,
                { backgroundColor: palette.primary },
                pressed(p),
              ]}
              accessibilityRole="button"
              accessibilityLabel="写真を撮影して健診結果を取り込む"
            >
              <Text style={styles.uploadButtonEmoji}>📷</Text>
              <Text style={styles.uploadButtonText}>写真を撮影</Text>
            </Pressable>
            <Pressable
              onPress={() => pickImage(false)}
              style={({ pressed: p }) => [
                styles.uploadButton,
                { backgroundColor: c.surfaceAlt },
                pressed(p),
              ]}
              accessibilityRole="button"
              accessibilityLabel="アルバムから健診結果を選択"
            >
              <Text style={styles.uploadButtonEmoji}>🖼️</Text>
              <Text style={[styles.uploadButtonText, { color: c.text }]}>アルバムから選択</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Loading state */}
      {isLoading && (
        <ActivityIndicator size="large" color={palette.primary} style={{ marginVertical: spacing.xl }} />
      )}

      {/* Latest result */}
      {latestCheckup && (
        <>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>最新の結果</Text>
          <CheckupCard checkup={latestCheckup} isDark={isDark} />
          {/* AI Advice generation button — shown when no advice yet */}
          {latestCheckup.advice_json == null && (
            <Pressable
              onPress={() => {
                generateAdvice.mutate(latestCheckup.id, {
                  onError: (err) => Alert.alert('エラー', (err as Error).message),
                });
              }}
              disabled={generateAdvice.isPending}
              style={({ pressed: p }) => [
                styles.adviceButton,
                { backgroundColor: palette.primary, opacity: generateAdvice.isPending ? 0.7 : 1 },
                pressed(p),
              ]}
              accessibilityRole="button"
              accessibilityLabel="AIに栄養アドバイスを生成させる"
            >
              {generateAdvice.isPending ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Text style={styles.adviceButtonText}>AIアドバイスを生成</Text>
              )}
            </Pressable>
          )}
        </>
      )}

      {/* History */}
      {historyCheckups.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>過去の記録</Text>
          {historyCheckups.map((ck) => (
            <CheckupCard key={ck.id} checkup={ck} isDark={isDark} />
          ))}
        </>
      )}

      {/* Empty state */}
      {!isLoading && checkups.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[typography.body, { color: c.textMuted, textAlign: 'center' }]}>
            まだ健診結果が登録されていません
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { ...commonStyles.sectionHeader },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  uploadButtonEmoji: { fontSize: 28 },
  uploadButtonText: { color: palette.white, ...typography.caption1, fontWeight: '600' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    minWidth: 80,
  },
  metricValue: { ...typography.bodyBold, marginTop: 2 },
  metricEmoji: { fontSize: 12, marginTop: 2 },
  emptyState: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  adviceContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  adviceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    minHeight: 48,
  },
  adviceButtonText: { color: palette.white, ...typography.caption1, fontWeight: '700' },
});
