import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ChatMessage } from '@/src/stores/chatStore';
import {
  palette, typography, spacing, radius, shadow, useThemeColors,
} from '@/src/lib/theme';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isDark: boolean;
}

// Remove JSON blocks from display text
function getDisplayText(content: string): string {
  return content.replace(/```json:food_analysis[\s\S]*?```/g, '').trim();
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function ChatMessageBubble({ message, isDark }: ChatMessageBubbleProps) {
  const c = useThemeColors(isDark);
  const isUser = message.role === 'user';
  const displayText = getDisplayText(message.content);

  if (!displayText && !message.isStreaming) return null;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {/* AI avatar */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: palette.primaryMuted }]}>
          <FontAwesome name="leaf" size={14} color={palette.primary} />
        </View>
      )}

      <View style={styles.bubbleCol}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, shadow.colored(palette.primary)]
              : [styles.assistantBubble, { backgroundColor: c.surface }, shadow.sm],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? { color: palette.white } : { color: c.text },
            ]}
          >
            {displayText}
            {message.isStreaming && (
              <Text style={styles.cursor}> |</Text>
            )}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: c.textMuted }, isUser && styles.timestampUser]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  bubbleCol: {
    maxWidth: '75%',
    gap: 3,
  },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  userBubble: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  cursor: {
    color: palette.primary,
    fontWeight: '300',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '400',
    paddingHorizontal: 4,
  },
  timestampUser: {
    textAlign: 'right',
  },
});
