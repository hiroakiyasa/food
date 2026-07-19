import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Text,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { eatenAtForDate, getToday } from '@/src/utils/formatters';
import { useColorScheme } from '@/components/useColorScheme';
import { useChatStore } from '@/src/stores/chatStore';
import { useStreamingChat } from '@/src/hooks/useStreamingChat';
import { useCreateMeal } from '@/src/hooks/useMeals';
import { useAuthStore } from '@/src/stores/authStore';
import { useVoiceRecognition } from '@/src/hooks/useVoiceRecognition';
import { useTTS } from '@/src/hooks/useTTS';
import { MEAL_TYPES, type MealType } from '@/src/lib/constants';
import { ChatMessageBubble } from '@/src/components/chat/ChatMessageBubble';
import { ChatAnalysisCard } from '@/src/components/chat/ChatAnalysisCard';
import { ChatInputBar } from '@/src/components/chat/ChatInputBar';
import { VoiceButton } from '@/src/components/chat/VoiceButton';
import {
  palette, typography, spacing, radius, useThemeColors,
} from '@/src/lib/theme';

const GREETING_MESSAGE = 'こんにちは！AI食事アシスタントです。今日は何を食べましたか？料理名や食材を教えてください。';
const AUTO_RECORD_DELAY_MS = 300;

export default function ChatMealModal() {
  const router = useRouter();
  const { mealType, date } = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getToday();
  const isDark = useColorScheme() === 'dark';
  const c = useThemeColors(isDark);
  const user = useAuthStore((s) => s.user);
  const createMeal = useCreateMeal();

  const {
    messages,
    isStreaming,
    latestAnalysis,
    selectedMealType,
    setSelectedMealType,
    inputMode,
    setInputMode,
    sendMode,
    error,
    resetChat,
    addAssistantMessage,
    appendToMessage,
    finalizeMessage,
  } = useChatStore();

  const { sendMessage, abortStream } = useStreamingChat();
  const scrollViewRef = useRef<ScrollView>(null);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);
  const prevMessageCountRef = useRef(0);

  // TTS with auto-record callback
  const { speak, stop: stopTTS } = useTTS({
    onDone: () => {
      if (sendMode === 'auto' && inputMode === 'voice' && !isStreaming) {
        setTimeout(() => {
          startRecording();
        }, AUTO_RECORD_DELAY_MS);
      }
    },
  });

  // Voice recognition
  const handleVoiceFinalTranscript = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const {
    isRecording,
    interimTranscript,
    startRecording,
    stopRecording,
    sendManualTranscript,
    isAvailable: isVoiceAvailable,
  } = useVoiceRecognition({
    onFinalTranscript: handleVoiceFinalTranscript,
  });

  // Initialize chat
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    resetChat();

    if (mealType && MEAL_TYPES.includes(mealType as MealType)) {
      setSelectedMealType(mealType as MealType);
    }

    const greetingId = addAssistantMessage();
    appendToMessage(greetingId, GREETING_MESSAGE);
    finalizeMessage(greetingId);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, latestAnalysis]);

  // TTS for new assistant messages when streaming completes
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > prevMessageCountRef.current) {
      const lastMessage = messages[currentCount - 1];
      if (
        lastMessage &&
        lastMessage.role === 'assistant' &&
        !lastMessage.isStreaming &&
        lastMessage.content.trim()
      ) {
        const prevLast = prevMessageCountRef.current > 0
          ? messages[prevMessageCountRef.current - 1]
          : null;
        const isNewMessage = !prevLast || prevLast.id !== lastMessage.id;
        if (isNewMessage && inputMode === 'voice') {
          speak(lastMessage.content);
        }
      }
    }
    prevMessageCountRef.current = currentCount;
  }, [messages.length, messages[messages.length - 1]?.isStreaming]);

  // Cleanup on unmount — also abort any in-flight stream so it stops
  // consuming tokens and updating state after the screen is gone.
  useEffect(() => {
    return () => {
      stopTTS();
      abortStream();
      resetChat();
    };
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      stopTTS();
      sendMessage(text);
    },
    [sendMessage, stopTTS],
  );

  const handleToggleInputMode = useCallback(() => {
    stopTTS();
    if (isRecording) stopRecording();
    setInputMode(inputMode === 'text' ? 'voice' : 'text');
  }, [inputMode, setInputMode, stopTTS, isRecording, stopRecording]);

  const handleSave = async () => {
    if (!latestAnalysis || !user) return;

    stopTTS();
    setSaving(true);
    try {
      const analysis = latestAnalysis;
      const totals = analysis.items.reduce(
        (acc, item) => ({
          energy_kcal: acc.energy_kcal + item.energy_kcal,
          protein_g: acc.protein_g + item.protein_g,
          fat_g: acc.fat_g + item.fat_g,
          carbohydrate_g: acc.carbohydrate_g + item.carbohydrate_g,
          fiber_g: acc.fiber_g + item.fiber_g,
          sodium_mg: acc.sodium_mg + item.sodium_mg,
        }),
        { energy_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0, fiber_g: 0, sodium_mg: 0 },
      );

      await createMeal.mutateAsync({
        meal: {
          meal_type: selectedMealType,
          eaten_at: eatenAtForDate(targetDate),
          total_energy_kcal: totals.energy_kcal,
          total_protein_g: totals.protein_g,
          total_fat_g: totals.fat_g,
          total_carbohydrate_g: totals.carbohydrate_g,
          total_fiber_g: totals.fiber_g,
          total_sodium_mg: totals.sodium_mg,
        },
        items: analysis.items.map((item) => ({
          ai_detected_name: item.name,
          portion_grams: item.portion_grams,
          confidence: item.confidence,
          energy_kcal: item.energy_kcal,
          protein_g: item.protein_g,
          fat_g: item.fat_g,
          carbohydrate_g: item.carbohydrate_g,
          fiber_g: item.fiber_g,
          sodium_mg: item.sodium_mg,
        })),
      });

      resetChat();
      router.dismiss();
    } catch (err) {
      Alert.alert('保存エラー', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const voiceButton = (
    <VoiceButton
      isRecording={isRecording}
      interimTranscript={interimTranscript}
      onPressStart={startRecording}
      onPressStop={stopRecording}
      onPressSend={sendManualTranscript}
      sendMode={sendMode}
      isDark={isDark}
      disabled={isStreaming}
    />
  );

  const showWelcome = messages.length <= 1 && !latestAnalysis;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome hints (shown only at start) */}
        {showWelcome && (
          <View style={styles.welcomeSection}>
            <View style={[styles.welcomeIcon, { backgroundColor: palette.primaryMuted }]}>
              <FontAwesome name="leaf" size={24} color={palette.primary} />
            </View>
            <Text style={[styles.welcomeTitle, { color: c.text }]}>AI食事アシスタント</Text>
            <Text style={[styles.welcomeSubtitle, { color: c.textMuted }]}>
              食べたものを教えてください{'\n'}栄養素を自動で計算します
            </Text>

            <View style={styles.hintCards}>
              {[
                { icon: 'commenting-o' as const, text: '「ラーメンとチャーハン」' },
                { icon: 'cutlery' as const, text: '「サラダチキンとおにぎり2個」' },
                { icon: 'coffee' as const, text: '「朝にトーストとコーヒー」' },
              ].map((hint, i) => (
                <View key={i} style={[styles.hintCard, { backgroundColor: c.surface }]}>
                  <FontAwesome name={hint.icon} size={14} color={palette.primary} />
                  <Text style={[styles.hintText, { color: c.textSecondary }]}>{hint.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            isDark={isDark}
          />
        ))}

        {latestAnalysis && (
          <ChatAnalysisCard
            analysis={latestAnalysis}
            selectedMealType={selectedMealType}
            onMealTypeChange={setSelectedMealType}
            onSave={handleSave}
            saving={saving}
            isDark={isDark}
          />
        )}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: isDark ? '#7F1D1D20' : '#FEF2F2' }]}>
            <FontAwesome name="exclamation-circle" size={14} color={palette.error} />
            <Text style={[styles.errorText, { color: palette.error }]}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      <ChatInputBar
        onSend={handleSend}
        onToggleInputMode={handleToggleInputMode}
        inputMode={inputMode}
        isStreaming={isStreaming}
        isDark={isDark}
        voiceButton={voiceButton}
        showVoiceToggle={isVoiceAvailable}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  // Welcome section
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '400',
  },
  hintCards: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
