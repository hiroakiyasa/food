import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, Linking,
  TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useCreateMeal } from '@/src/hooks/useMeals';
import { eatenAtForDate, getToday } from '@/src/utils/formatters';
import {
  palette, typography, spacing, radius, shadow,
  commonStyles, pressed, useThemeColors,
} from '@/src/lib/theme';
import { useColorScheme } from '@/components/useColorScheme';
import type { Database } from '@/src/types/database';

type CommercialProduct = Database['public']['Tables']['commercial_products']['Row'];

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
];

const NOVA_COLORS: Record<number, string> = {
  1: palette.success,
  2: '#84CC16',
  3: palette.warning,
  4: palette.error,
};

const NOVA_LABELS: Record<number, string> = {
  1: '最小限の加工',
  2: '加工済み原材料',
  3: '加工食品',
  4: '超加工食品',
};

const PORTION_PRESETS = [50, 100, 150, 200];

function NovaBadge({ nova }: { nova: number }) {
  const color = NOVA_COLORS[nova] ?? palette.warning;
  const label = NOVA_LABELS[nova] ?? `NOVA ${nova}`;
  return (
    <View style={[styles.novaBadge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.novaBadgeText, { color }]}>NOVA {nova} — {label}</Text>
    </View>
  );
}

function NutritionRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{value.toFixed(1)}{unit}</Text>
    </View>
  );
}

export default function BarcodeModal() {
  const router = useRouter();
  const { mealType: requestedMealType, date } = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getToday();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState<CommercialProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portionGrams, setPortionGrams] = useState(100);
  const [customPortion, setCustomPortion] = useState('');
  const [mealType, setMealType] = useState<MealType>(() =>
    MEAL_TYPES.some((item) => item.value === requestedMealType)
      ? requestedMealType as MealType
      : 'lunch',
  );
  const createMeal = useCreateMeal();

  if (!permission?.granted) {
    const canAskAgain = permission?.canAskAgain ?? true;
    return (
      <View style={[styles.permissionContainer, { backgroundColor: c.bg }]}>
        <Text style={[typography.title3, { color: c.text, marginBottom: spacing.sm }]}>
          カメラへのアクセスが必要です
        </Text>
        <Text
          style={[
            typography.body,
            { color: c.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
          ]}
        >
          商品のバーコードを読み取るためにカメラを使用します。
          {!canAskAgain && '\n設定アプリからカメラの利用を許可してください。'}
        </Text>
        <Pressable
          onPress={() => {
            if (canAskAgain) {
              requestPermission();
            } else {
              Linking.openSettings();
            }
          }}
          style={({ pressed: p }) => [commonStyles.buttonPrimary, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel={canAskAgain ? 'カメラを許可する' : '設定を開く'}
        >
          <Text style={commonStyles.buttonText}>
            {canAskAgain ? '許可する' : '設定を開く'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed: p }) => [styles.permissionCloseButton, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={[typography.bodyBold, { color: c.textSecondary }]}>閉じる</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setNotFound(false);
    setProduct(null);

    try {
      const { data: productData, error } = await supabase.functions.invoke(
        'barcode-lookup',
        { body: { barcode: data } },
      );
      if (error) throw error;

      if (productData) {
        setProduct(productData as CommercialProduct);
        setPortionGrams(100);
        setCustomPortion('');
      } else {
        setNotFound(true);
      }
    } catch (err) {
      Alert.alert('エラー', (err as Error).message);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async () => {
    if (!product) return;

    const ratio = portionGrams / 100;
    const energy = (product.energy_kcal ?? 0) * ratio;
    const protein = (product.protein_g ?? 0) * ratio;
    const fat = (product.fat_g ?? 0) * ratio;
    const carbs = (product.carbohydrate_g ?? 0) * ratio;
    const sodium = (product.sodium_mg ?? 0) * ratio;

    try {
      await createMeal.mutateAsync({
        meal: {
          meal_type: mealType,
          eaten_at: eatenAtForDate(targetDate),
          total_energy_kcal: energy,
          total_protein_g: protein,
          total_fat_g: fat,
          total_carbohydrate_g: carbs,
          total_sodium_mg: sodium,
        },
        items: [
          {
            ai_detected_name: product.product_name,
            commercial_product_id: product.id,
            portion_grams: portionGrams,
            energy_kcal: energy,
            protein_g: protein,
            fat_g: fat,
            carbohydrate_g: carbs,
            sodium_mg: sodium,
          },
        ],
      });
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    }
  };

  const handlePortionPreset = (grams: number) => {
    setPortionGrams(grams);
    setCustomPortion('');
  };

  const handleCustomPortion = (text: string) => {
    setCustomPortion(text);
    const val = parseFloat(text);
    if (!isNaN(val) && val > 0) {
      setPortionGrams(val);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setProduct(null);
    setNotFound(false);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Camera */}
      {!product && !notFound && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
          onBarcodeScanned={handleBarcodeScanned}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed: p }) => [styles.closeButton, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.scanArea}>
            {loading ? (
              <ActivityIndicator size="large" color={palette.primary} />
            ) : (
              <>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>バーコードをスキャンしてください</Text>
              </>
            )}
          </View>
        </CameraView>
      )}

      {/* Product detail panel */}
      {product && (
        <ScrollView
          style={[styles.panel, { backgroundColor: c.bg }]}
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.panelHeader, { backgroundColor: palette.primary }]}>
            <Pressable
              onPress={resetScan}
              style={({ pressed: p }) => [styles.rescanButton, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="再スキャン"
            >
              <Text style={styles.rescanText}>↩ 再スキャン</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed: p }) => [styles.closeButtonPanel, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Product info */}
          <View style={styles.panelBody}>
            <Text style={[typography.title2, { color: c.text, marginBottom: 4 }]}>
              {product.product_name}
            </Text>
            {product.brand && (
              <Text style={[typography.caption1, { color: c.textMuted, marginBottom: spacing.md }]}>
                {product.brand}
              </Text>
            )}
            {product.nova_classification != null && (
              <NovaBadge nova={product.nova_classification} />
            )}

            {/* Nutrition table */}
            <View style={[commonStyles.card, { backgroundColor: c.surface, marginTop: spacing.lg }, shadow.sm]}>
              <Text style={[typography.caption1, { color: c.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm }]}>
                栄養成分 (100gあたり)
              </Text>
              <NutritionRow label="エネルギー" value={product.energy_kcal} unit=" kcal" />
              <NutritionRow label="たんぱく質" value={product.protein_g} unit="g" />
              <NutritionRow label="脂質" value={product.fat_g} unit="g" />
              <NutritionRow label="炭水化物" value={product.carbohydrate_g} unit="g" />
              {product.sodium_mg != null && (
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionLabel}>塩分相当量</Text>
                  <Text style={styles.nutritionValue}>{(product.sodium_mg / 1000 * 2.54).toFixed(1)}g</Text>
                </View>
              )}
            </View>

            {/* Portion selector */}
            <Text style={[typography.bodyBold, { color: c.text, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
              分量
            </Text>
            <View style={styles.presetRow}>
              {PORTION_PRESETS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => handlePortionPreset(g)}
                  style={({ pressed: p }) => [
                    styles.presetChip,
                    {
                      backgroundColor: portionGrams === g && customPortion === ''
                        ? palette.primary
                        : c.surfaceAlt,
                    },
                    pressed(p),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${g}g`}
                >
                  <Text style={[
                    styles.presetChipText,
                    { color: portionGrams === g && customPortion === '' ? palette.white : c.text },
                  ]}>
                    {g}g
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.customInput, { borderColor: c.border, backgroundColor: c.surface }]}>
              <TextInput
                value={customPortion}
                onChangeText={handleCustomPortion}
                placeholder="カスタム (g)"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={[typography.body, { color: c.text, flex: 1 }]}
                accessibilityLabel="分量を入力"
              />
              <Text style={[typography.caption1, { color: c.textMuted }]}>g</Text>
            </View>

            {/* Calorie preview */}
            <View style={[styles.caloriePreview, { backgroundColor: palette.primaryLight }]}>
              <Text style={[typography.caption1, { color: palette.primaryDark }]}>この分量のカロリー</Text>
              <Text style={[typography.title2, { color: palette.primaryDark }]}>
                {Math.round((product.energy_kcal ?? 0) * portionGrams / 100)} kcal
              </Text>
            </View>

            {/* Meal type selector */}
            <Text style={[typography.bodyBold, { color: c.text, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
              食事タイプ
            </Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt.value}
                  onPress={() => setMealType(mt.value)}
                  style={({ pressed: p }) => [
                    styles.mealTypeChip,
                    {
                      backgroundColor: mealType === mt.value ? palette.primary : c.surfaceAlt,
                      flex: 1,
                    },
                    pressed(p),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={mt.label}
                >
                  <Text style={[styles.mealTypeText, { color: mealType === mt.value ? palette.white : c.text }]}>
                    {mt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add button */}
            <Pressable
              onPress={handleAddMeal}
              disabled={createMeal.isPending}
              style={({ pressed: p }) => [commonStyles.buttonPrimary, { marginTop: spacing.xl }, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="食事に追加"
            >
              {createMeal.isPending ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={commonStyles.buttonText}>食事に追加</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Not found panel */}
      {notFound && (
        <View style={[styles.panel, styles.notFoundPanel, { backgroundColor: c.bg }]}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed: p }) => [styles.closeButton, pressed(p)]}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Text style={{ color: c.text, fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>
          <Text style={[typography.title3, { color: c.text, textAlign: 'center', marginBottom: spacing.md }]}>
            商品が見つかりません
          </Text>
          <Text style={[typography.body, { color: c.textMuted, textAlign: 'center', marginBottom: spacing.xl }]}>
            この商品はデータベースに登録されていません
          </Text>
          <Pressable
            onPress={resetScan}
            style={({ pressed: p }) => [commonStyles.buttonPrimary, pressed(p)]}
            accessibilityRole="button"
            accessibilityLabel="再スキャン"
          >
            <Text style={commonStyles.buttonText}>再スキャン</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Camera
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionCloseButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  topBar: { paddingTop: 60, paddingHorizontal: spacing.lg },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 20 },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 280,
    height: 150,
    borderWidth: 2,
    borderColor: palette.primary,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  scanText: { color: '#fff', fontSize: 16 },

  // Panel
  panel: { flex: 1 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  rescanButton: { paddingVertical: 6, paddingHorizontal: spacing.md },
  rescanText: { color: palette.white, ...typography.caption1, fontWeight: '600' },
  closeButtonPanel: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelContent: { paddingBottom: 40 },
  panelBody: { padding: spacing.lg },

  // NOVA badge
  novaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  novaBadgeText: { ...typography.caption1, fontWeight: '700' },

  // Nutrition table
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E9E5D8',
  },
  nutritionLabel: { ...typography.body, color: '#66766F' },
  nutritionValue: { ...typography.body, fontWeight: '600', color: '#0F172A' },

  // Portion
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    flex: 1,
  },
  presetChipText: { ...typography.caption1, fontWeight: '600' },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  caloriePreview: {
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },

  // Meal type
  mealTypeRow: { flexDirection: 'row', gap: spacing.sm },
  mealTypeChip: {
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  mealTypeText: { ...typography.caption1, fontWeight: '600' },

  // Not found
  notFoundPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
