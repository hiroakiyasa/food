import { useCallback, useRef } from 'react';
import { useChatStore } from '@/src/stores/chatStore';
import { startChatStream } from '@/src/services/chat/streamingClient';

export function useStreamingChat() {
  const {
    addUserMessage,
    addAssistantMessage,
    appendToMessage,
    finalizeMessage,
    setLatestAnalysis,
    setIsStreaming,
    setError,
    getMessagesForAPI,
  } = useChatStore();

  const abortRef = useRef<{ abort: () => void } | null>(null);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      addUserMessage(content);
      const assistantId = addAssistantMessage();
      setIsStreaming(true);
      setError(null);

      const messages = getMessagesForAPI();

      const stream = startChatStream(messages, {
        onTextDelta: (chunk) => {
          appendToMessage(assistantId, chunk);
        },
        onAnalysis: (analysis) => {
          setLatestAnalysis(analysis);
        },
        onDone: () => {
          finalizeMessage(assistantId);
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (error) => {
          finalizeMessage(assistantId);
          setIsStreaming(false);
          setError(error);
          abortRef.current = null;
        },
      });

      abortRef.current = stream;
    },
    [
      addUserMessage,
      addAssistantMessage,
      appendToMessage,
      finalizeMessage,
      setLatestAnalysis,
      setIsStreaming,
      setError,
      getMessagesForAPI,
    ],
  );

  const abortStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, [setIsStreaming]);

  return { sendMessage, abortStream };
}
