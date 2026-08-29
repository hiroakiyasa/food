import { create } from 'zustand';
import type { AIFoodAnalysis } from '@/src/types/nutrition';
import type { MealType } from '@/src/lib/constants';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming: boolean;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  addUserMessage: (content: string) => string;
  addAssistantMessage: () => string;
  appendToMessage: (id: string, chunk: string) => void;
  finalizeMessage: (id: string) => void;
  latestAnalysis: AIFoodAnalysis | null;
  setLatestAnalysis: (a: AIFoodAnalysis | null) => void;
  selectedMealType: MealType;
  setSelectedMealType: (t: MealType) => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  inputMode: 'text' | 'voice';
  setInputMode: (m: 'text' | 'voice') => void;
  sendMode: 'auto' | 'manual';
  setSendMode: (m: 'auto' | 'manual') => void;
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;
  interimTranscript: string;
  setInterimTranscript: (t: string) => void;
  isSpeaking: boolean;
  setIsSpeaking: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  resetChat: () => void;
  getMessagesForAPI: () => { role: 'user' | 'model'; content: string }[];
}

let messageCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],

  addUserMessage: (content: string) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'user', content, isStreaming: false, timestamp: Date.now() },
      ],
    }));
    return id;
  },

  addAssistantMessage: () => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'assistant', content: '', isStreaming: true, timestamp: Date.now() },
      ],
    }));
    return id;
  },

  appendToMessage: (id: string, chunk: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m,
      ),
    }));
  },

  finalizeMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m,
      ),
    }));
  },

  latestAnalysis: null,
  setLatestAnalysis: (a) => set({ latestAnalysis: a }),

  selectedMealType: 'lunch',
  setSelectedMealType: (t) => set({ selectedMealType: t }),

  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),

  inputMode: 'text',
  setInputMode: (m) => set({ inputMode: m }),

  sendMode: 'manual',
  setSendMode: (m) => set({ sendMode: m }),

  isRecording: false,
  setIsRecording: (v) => set({ isRecording: v }),

  interimTranscript: '',
  setInterimTranscript: (t) => set({ interimTranscript: t }),

  isSpeaking: false,
  setIsSpeaking: (v) => set({ isSpeaking: v }),

  error: null,
  setError: (e) => set({ error: e }),

  resetChat: () =>
    set({
      messages: [],
      latestAnalysis: null,
      isStreaming: false,
      isRecording: false,
      interimTranscript: '',
      isSpeaking: false,
      error: null,
    }),

  getMessagesForAPI: () => {
    const { messages } = get();
    return messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-20)
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        content: m.content,
      }));
  },
}));
