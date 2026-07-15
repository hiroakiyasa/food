import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as ExpoSpeech from 'expo-speech';
import { useChatStore } from '@/src/stores/chatStore';

// Try to load native speech module
let SpeechNative: any = null;
let nativeAvailable = false;

try {
  SpeechNative = require('@/modules/speech-native').SpeechNativeModule;
  nativeAvailable = Platform.OS === 'ios' && !!SpeechNative;
} catch {
  nativeAvailable = false;
}

// Remove JSON blocks from TTS text
function cleanTextForTTS(text: string): string {
  return text.replace(/```json:food_analysis[\s\S]*?```/g, '').trim();
}

interface UseTTSOptions {
  onDone?: () => void;
}

export function useTTS({ onDone }: UseTTSOptions = {}) {
  const { setIsSpeaking } = useChatStore();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Register native onSpeechDone listener
  useEffect(() => {
    if (!nativeAvailable || !SpeechNative) return;

    const sub = SpeechNative.addListener('onSpeechDone', () => {
      setIsSpeaking(false);
      onDoneRef.current?.();
    });

    return () => {
      sub?.remove();
    };
  }, [setIsSpeaking]);

  const speak = useCallback(
    (text: string) => {
      const cleanText = cleanTextForTTS(text);
      if (!cleanText) {
        onDoneRef.current?.();
        return;
      }

      setIsSpeaking(true);

      if (nativeAvailable && SpeechNative) {
        // Use native module (SFSpeechSynthesizer)
        SpeechNative.speak(cleanText, 'ja-JP', 1.0);
      } else {
        // Fallback to expo-speech
        ExpoSpeech.speak(cleanText, {
          language: 'ja-JP',
          rate: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            onDoneRef.current?.();
          },
          onError: () => {
            setIsSpeaking(false);
          },
        });
      }
    },
    [setIsSpeaking],
  );

  const stop = useCallback(() => {
    if (nativeAvailable && SpeechNative) {
      SpeechNative.stopSpeaking();
    } else {
      ExpoSpeech.stop();
    }
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  return { speak, stop };
}
