import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  palette, typography, spacing, radius, shadow, pressed, useThemeColors,
} from '@/src/lib/theme';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onToggleInputMode: () => void;
  inputMode: 'text' | 'voice';
  isStreaming: boolean;
  isDark: boolean;
  voiceButton?: React.ReactNode;
  showVoiceToggle?: boolean;
}

export function ChatInputBar({
  onSend,
  onToggleInputMode,
  inputMode,
  isStreaming,
  isDark,
  voiceButton,
  showVoiceToggle = true,
}: ChatInputBarProps) {
  const c = useThemeColors(isDark);
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !isStreaming;

  if (inputMode === 'voice' && voiceButton) {
    return (
      <View style={[styles.container, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <Pressable
          onPress={onToggleInputMode}
          hitSlop={8}
          style={({ pressed: p }) => [styles.modeButton, { backgroundColor: c.surfaceAlt }, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="テキスト入力に切り替え"
        >
          <Ionicons name="chatbubble-outline" size={20} color={c.textSecondary} />
        </Pressable>
        <View style={styles.voiceArea}>
          {voiceButton}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderTopColor: c.border }]}>
      {showVoiceToggle && (
        <Pressable
          onPress={onToggleInputMode}
          hitSlop={8}
          style={({ pressed: p }) => [styles.modeButton, { backgroundColor: c.surfaceAlt }, pressed(p)]}
          accessibilityRole="button"
          accessibilityLabel="音声入力に切り替え"
        >
          <Ionicons name="mic-outline" size={20} color={c.textSecondary} />
        </Pressable>
      )}
      <View style={[styles.inputWrap, { backgroundColor: c.surfaceAlt }]}>
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="食事内容を入力..."
          placeholderTextColor={c.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
          editable={!isStreaming}
        />
      </View>
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        hitSlop={8}
        style={({ pressed: p }) => [
          styles.sendButton,
          canSend
            ? [{ backgroundColor: palette.primary }, shadow.colored(palette.primary)]
            : { backgroundColor: c.surfaceAlt },
          pressed(p),
        ]}
        accessibilityRole="button"
        accessibilityLabel="送信"
      >
        <Ionicons
          name="arrow-up"
          size={18}
          color={canSend ? palette.white : c.textMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  modeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginBottom: 2,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    minHeight: 40,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: spacing.sm,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  voiceArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
