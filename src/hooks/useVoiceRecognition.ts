import { useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useChatStore } from '@/src/stores/chatStore';

const SILENCE_TIMEOUT_MS = 1500;

// Try to load native speech module (only available in dev builds, not Expo Go)
let SpeechNative: any = null;
let speechAvailable = false;

try {
  SpeechNative = require('@/modules/speech-native').SpeechNativeModule;
  speechAvailable = Platform.OS === 'ios' && !!SpeechNative;
} catch {
  speechAvailable = false;
}

interface UseVoiceRecognitionOptions {
  onFinalTranscript: (text: string) => void;
}

export function useVoiceRecognition({ onFinalTranscript }: UseVoiceRecognitionOptions) {
  const {
    isRecording,
    setIsRecording,
    interimTranscript,
    setInterimTranscript,
    sendMode,
  } = useChatStore();

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTextRef = useRef('');
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Register native event listeners
  useEffect(() => {
    if (!speechAvailable || !SpeechNative) return;

    const transcriptSub = SpeechNative.addListener(
      'onTranscript',
      (event: { text: string; isFinal: boolean }) => {
        const transcript = event.text ?? '';

        if (event.isFinal) {
          accumulatedTextRef.current = transcript;
          setInterimTranscript('');

          const currentSendMode = useChatStore.getState().sendMode;
          if (currentSendMode === 'manual') {
            setInterimTranscript(transcript);
          } else {
            onFinalTranscriptRef.current(transcript);
            accumulatedTextRef.current = '';
          }
        } else {
          accumulatedTextRef.current = transcript;
          setInterimTranscript(transcript);

          // Reset silence timer for auto mode
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          const currentSendMode = useChatStore.getState().sendMode;
          if (currentSendMode === 'auto') {
            silenceTimerRef.current = setTimeout(() => {
              const text = accumulatedTextRef.current.trim();
              if (text) {
                SpeechNative.stopTranscribing();
                onFinalTranscriptRef.current(text);
                accumulatedTextRef.current = '';
              }
            }, SILENCE_TIMEOUT_MS);
          }
        }
      },
    );

    const recordingSub = SpeechNative.addListener(
      'onRecordingStatusChange',
      (event: { isRecording: boolean }) => {
        setIsRecording(event.isRecording);
        if (!event.isRecording) {
          clearSilenceTimer();
        }
      },
    );

    const errorSub = SpeechNative.addListener(
      'onError',
      (event: { message: string }) => {
        console.warn('Speech recognition error:', event.message);
      },
    );

    return () => {
      transcriptSub?.remove();
      recordingSub?.remove();
      errorSub?.remove();
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!speechAvailable || !SpeechNative) {
      Alert.alert(
        '音声認識が利用できません',
        'この機能はDevelopment Buildが必要です。Expo Goでは利用できません。',
      );
      return;
    }

    try {
      const result = await SpeechNative.requestPermissions();
      if (!result.granted) {
        Alert.alert('権限エラー', 'マイクと音声認識の権限を許可してください。');
        return;
      }

      accumulatedTextRef.current = '';
      setInterimTranscript('');
      SpeechNative.startTranscribing('ja-JP');
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  }, [setIsRecording, setInterimTranscript]);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    if (speechAvailable && SpeechNative) {
      SpeechNative.stopTranscribing();
    }
  }, [clearSilenceTimer]);

  const sendManualTranscript = useCallback(() => {
    const text = accumulatedTextRef.current.trim() || interimTranscript.trim();
    if (text) {
      stopRecording();
      onFinalTranscriptRef.current(text);
      accumulatedTextRef.current = '';
      setInterimTranscript('');
    }
  }, [interimTranscript, stopRecording, setInterimTranscript]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (speechAvailable && SpeechNative && isRecording) {
        SpeechNative.stopTranscribing();
      }
    };
  }, []);

  return {
    isRecording,
    interimTranscript,
    startRecording,
    stopRecording,
    sendManualTranscript,
    isAvailable: speechAvailable,
  };
}
