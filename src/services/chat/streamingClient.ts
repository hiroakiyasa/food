import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/src/lib/constants';
import { useAuthStore } from '@/src/stores/authStore';
import type { AIFoodAnalysis } from '@/src/types/nutrition';

const CHAT_MEAL_URL = `${SUPABASE_URL}/functions/v1/chat-meal`;

interface SSECallbacks {
  onTextDelta: (content: string) => void;
  onAnalysis: (analysis: AIFoodAnalysis) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

interface ChatAPIMessage {
  role: 'user' | 'model';
  content: string;
}

export function startChatStream(
  messages: ChatAPIMessage[],
  callbacks: SSECallbacks,
): { abort: () => void } {
  const accessToken = useAuthStore.getState().session?.access_token;
  if (!accessToken) {
    callbacks.onError('認証セッションが見つかりません。再ログインしてからお試しください。');
    return {
      abort: () => undefined,
    };
  }

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;
  let aborted = false;
  let settled = false;
  let eventBuffer = '';

  const settleWithDone = () => {
    if (aborted || settled) return;
    settled = true;
    callbacks.onDone();
  };

  const settleWithError = (message: string) => {
    if (aborted || settled) return;
    settled = true;
    callbacks.onError(message);
  };

  const handleEventBlock = (block: string) => {
    // SSE event block can contain multiple data lines. Join them before parsing.
    const dataLines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) return;
    const payload = dataLines.join('\n').trim();
    if (!payload) return;

    if (payload === '[DONE]') {
      settleWithDone();
      return;
    }

    try {
      const event = JSON.parse(payload);
      switch (event.type) {
        case 'text_delta':
          callbacks.onTextDelta(event.content);
          break;
        case 'analysis':
          callbacks.onAnalysis(event.analysis);
          break;
        case 'done':
          settleWithDone();
          break;
        case 'error':
          settleWithError(event.message ?? 'Unknown error');
          break;
      }
    } catch {
      // Ignore malformed events and keep reading subsequent chunks.
    }
  };

  const consumeSSE = (chunk: string, flush = false) => {
    if (!chunk && !flush) return;

    eventBuffer += chunk;
    eventBuffer = eventBuffer.replace(/\r\n/g, '\n');

    let delimiterIndex = eventBuffer.indexOf('\n\n');
    while (delimiterIndex >= 0) {
      const eventBlock = eventBuffer.slice(0, delimiterIndex);
      eventBuffer = eventBuffer.slice(delimiterIndex + 2);
      handleEventBlock(eventBlock);
      delimiterIndex = eventBuffer.indexOf('\n\n');
    }

    if (flush && eventBuffer.trim()) {
      handleEventBlock(eventBuffer);
      eventBuffer = '';
    }
  };

  xhr.open('POST', CHAT_MEAL_URL);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

  xhr.onprogress = () => {
    if (aborted) return;

    const newData = xhr.responseText.substring(lastIndex);
    lastIndex = xhr.responseText.length;
    consumeSSE(newData);
  };

  xhr.onerror = () => {
    if (!aborted) {
      settleWithError('Network error');
    }
  };

  xhr.onloadend = () => {
    if (aborted) return;

    consumeSSE('', true);

    if (settled) return;

    if (xhr.status >= 200 && xhr.status < 300) {
      // Fallback completion in case final done event was lost in transport.
      settleWithDone();
      return;
    }

    settleWithError(`HTTP ${xhr.status}: ${xhr.statusText || 'Request failed'}`);
  };

  xhr.send(JSON.stringify({ messages }));

  return {
    abort: () => {
      aborted = true;
      xhr.abort();
    },
  };
}
