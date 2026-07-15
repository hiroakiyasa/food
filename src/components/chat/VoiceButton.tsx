import { useEffect } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { palette, typography, spacing, radius, useThemeColors } from '@/src/lib/theme';

interface VoiceButtonProps {
  isRecording: boolean;
  interimTranscript: string;
  onPressStart: () => void;
  onPressStop: () => void;
  onPressSend?: () => void;
  sendMode: 'auto' | 'manual';
  isDark: boolean;
}

export function VoiceButton({
  isRecording,
  interimTranscript,
  onPressStart,
  onPressStop,
  onPressSend,
  sendMode,
  isDark,
}: VoiceButtonProps) {
  const c = useThemeColors(isDark);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 800 }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: isRecording ? 0.3 : 0,
  }));

  return (
    <View style={styles.container}>
      {/* Interim transcript display */}
      {interimTranscript ? (
        <Text
          style={[typography.body, styles.transcript, { color: c.text }]}
          numberOfLines={2}
        >
          {interimTranscript}
        </Text>
      ) : (
        <Text style={[typography.caption1, styles.hint, { color: c.textMuted }]}>
          {isRecording ? '聞いています...' : 'タップして話す'}
        </Text>
      )}

      <View style={styles.buttonRow}>
        {/* Main mic button */}
        <View style={styles.micContainer}>
          <Animated.View
            style={[styles.pulseRing, { backgroundColor: palette.error }, pulseStyle]}
          />
          <Pressable
            onPress={isRecording ? onPressStop : onPressStart}
            style={[
              styles.micButton,
              { backgroundColor: isRecording ? palette.error : palette.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? '録音停止' : '録音開始'}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={28}
              color={palette.white}
            />
          </Pressable>
        </View>

        {/* Manual send button */}
        {sendMode === 'manual' && isRecording && interimTranscript && (
          <Pressable
            onPress={onPressSend}
            style={[styles.sendButton, { backgroundColor: palette.primary }]}
            accessibilityRole="button"
            accessibilityLabel="送信"
          >
            <Ionicons name="arrow-up" size={20} color={palette.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  transcript: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 22,
  },
  hint: {
    textAlign: 'center',
    minHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
