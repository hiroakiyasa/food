import { useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MEAL_TYPES, type MealType } from '@/src/lib/constants';
import { palette, pressed, radius, shadow, spacing, typography } from '@/src/lib/theme';
import { useMealStore } from '@/src/stores/mealStore';

const ANALYSIS_IMAGE_MAX_EDGE = 1024;

async function prepareAnalysisImage(
  uri: string,
  width?: number,
  height?: number,
): Promise<{ uri: string; base64: string }> {
  const isLandscape = (width ?? 0) >= (height ?? 0);
  const resize = isLandscape
    ? { width: ANALYSIS_IMAGE_MAX_EDGE }
    : { height: ANALYSIS_IMAGE_MAX_EDGE };
  const context = ImageManipulator.manipulate(uri);
  context.resize(resize);
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: 0.72,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('解析用画像を準備できませんでした');
  return { uri: result.uri, base64: result.base64 };
}

export default function CameraModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mealType } = useLocalSearchParams<{ mealType?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const setPendingMeal = useMealStore((state) => state.setPendingMeal);
  const selectedMealType = MEAL_TYPES.includes(mealType as MealType)
    ? mealType as MealType
    : undefined;

  const openAnalysis = (imageUri: string, imageBase64: string) => {
    setPendingMeal({
      imageUri,
      imageBase64,
      analysis: null,
      isAnalyzing: true,
      error: null,
      mealType: selectedMealType,
    });
    router.replace('/(modals)/meal-detail');
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.82 });
      if (!photo?.uri) throw new Error('撮影画像を取得できませんでした');
      const prepared = await prepareAnalysisImage(photo.uri, photo.width, photo.height);
      openAnalysis(prepared.uri, prepared.base64);
    } catch (error) {
      Alert.alert('撮影できませんでした', (error as Error).message, [
        { text: 'もう一度試す' },
        { text: 'キャンセル', style: 'cancel', onPress: () => router.back() },
      ]);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleLibrary = async () => {
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libraryPermission.granted) {
      Alert.alert('写真へのアクセスが必要です', '設定から写真へのアクセスを許可してください。');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.82,
        base64: false,
      });
      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        const prepared = await prepareAnalysisImage(asset.uri, asset.width, asset.height);
        openAnalysis(prepared.uri, prepared.base64);
      }
    } catch (error) {
      Alert.alert('写真を読み込めませんでした', (error as Error).message);
    }
  };

  if (!permission) {
    return <View style={styles.loading}><ActivityIndicator color={palette.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <FontAwesome name="camera" size={32} color={palette.primary} />
        </View>
        <Text style={styles.permissionTitle}>食事を写真で記録</Text>
        <Text style={styles.permissionText}>
          料理を撮影して、AIが食品と栄養を解析します。撮影した写真は食事記録にだけ使用します。
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed: isPressed }) => [styles.permissionButton, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="カメラへのアクセスを許可"
        >
          <Text style={styles.permissionButtonText}>カメラを許可する</Text>
        </Pressable>
        <Pressable
          onPress={handleLibrary}
          style={({ pressed: isPressed }) => [styles.libraryPermissionButton, pressed(isPressed)]}
          accessibilityRole="button"
        >
          <Text style={styles.libraryPermissionText}>写真から選ぶ</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancelButton} accessibilityRole="button">
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torchEnabled}
      />
      <View style={styles.scrim} pointerEvents="none" />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed: isPressed }) => [styles.roundButton, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <FontAwesome name="close" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topCopy} pointerEvents="none">
          <Text style={styles.cameraTitle}>食事を撮影</Text>
          <Text style={styles.cameraSubtitle}>お皿全体が枠に入るように</Text>
        </View>
        <Pressable
          onPress={() => setTorchEnabled((value) => !value)}
          style={({ pressed: isPressed }) => [
            styles.roundButton,
            torchEnabled && styles.roundButtonActive,
            pressed(isPressed),
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: torchEnabled }}
          accessibilityLabel="フラッシュ"
        >
          <FontAwesome name="bolt" size={20} color={torchEnabled ? palette.ink : '#FFFFFF'} />
        </Pressable>
      </View>

      <View style={styles.guideWrap} pointerEvents="none">
        <View style={styles.guideFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.guidePill}>
            <FontAwesome name="leaf" size={13} color={palette.primaryDark} />
            <Text style={styles.guideText}>明るい場所で真上から撮ると正確です</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <Pressable
          onPress={handleLibrary}
          style={({ pressed: isPressed }) => [styles.secondaryControl, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="写真ライブラリから選ぶ"
        >
          <FontAwesome name="image" size={21} color="#FFFFFF" />
          <Text style={styles.controlLabel}>写真</Text>
        </Pressable>

        <Pressable
          onPress={handleCapture}
          disabled={isCapturing}
          style={({ pressed: isPressed }) => [styles.captureButton, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="食事を撮影"
          accessibilityState={{ disabled: isCapturing }}
        >
          <View style={styles.captureInner}>
            {isCapturing && <ActivityIndicator color={palette.primary} />}
          </View>
        </Pressable>

        <Pressable
          onPress={() => setFacing((value) => value === 'back' ? 'front' : 'back')}
          style={({ pressed: isPressed }) => [styles.secondaryControl, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="カメラを切り替える"
        >
          <FontAwesome name="refresh" size={21} color="#FFFFFF" />
          <Text style={styles.controlLabel}>切替</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/(modals)/barcode${selectedMealType ? `?mealType=${selectedMealType}` : ''}` as never)}
          style={({ pressed: isPressed }) => [styles.barcodePill, pressed(isPressed)]}
          accessibilityRole="button"
          accessibilityLabel="バーコードで記録"
        >
          <FontAwesome name="barcode" size={18} color={palette.ink} />
          <Text style={styles.barcodeText}>バーコードで記録</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07120E' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.cream },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,20,15,0.18)' },
  permissionContainer: {
    flex: 1,
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  permissionIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  permissionTitle: { ...typography.title1, color: palette.ink, textAlign: 'center' },
  permissionText: {
    ...typography.body,
    color: '#66766F',
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  permissionButton: {
    minHeight: 52,
    alignSelf: 'stretch',
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.colored(palette.primary),
  },
  permissionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  libraryPermissionButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xl },
  libraryPermissionText: { color: palette.primaryDark, fontWeight: '700' },
  cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xl },
  cancelButtonText: { color: '#66766F', fontWeight: '600' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  topCopy: { alignItems: 'center' },
  cameraTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  cameraSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(7,18,14,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonActive: { backgroundColor: palette.lemon },
  guideWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    paddingBottom: 170,
  },
  guideFrame: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  corner: { position: 'absolute', width: 48, height: 48, borderColor: '#FFFFFF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.lg },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.lg },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.lg },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.lg },
  guidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  guideText: { color: palette.primaryDark, fontSize: 11, fontWeight: '700' },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 160,
    backgroundColor: 'rgba(7,18,14,0.78)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  secondaryControl: { width: 58, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: 5 },
  controlLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    padding: 5,
    ...shadow.lg,
  },
  captureInner: {
    flex: 1,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodePill: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.lemon,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  barcodeText: { color: palette.ink, fontSize: 12, fontWeight: '800' },
});
