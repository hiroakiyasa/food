import { useEffect, useState, useCallback } from 'react';
import { useFastingStore } from '@/src/stores/fastingStore';
import {
  calcFastingState,
  startFastingSession,
  FASTING_PROTOCOLS,
  type FastingState,
  type FastingSession,
  type FastingProtocol,
} from '@/src/services/fasting/fastingEngine';

/**
 * 断食タイマーの状態と操作を提供するフック
 * 1秒ごとに状態を更新する
 */
export function useFasting() {
  const {
    activeSession,
    selectedProtocol,
    eatStartHour,
    isEnabled,
    setSession,
    setProtocol,
    setEatStartHour,
    setEnabled,
    endSession,
  } = useFastingStore();

  const [fastingState, setFastingState] = useState<FastingState>(() => {
    if (activeSession && !activeSession.completed) {
      // Dateオブジェクトは永続化後に文字列になるため変換
      const session = deserializeSession(activeSession);
      return calcFastingState(session);
    }
    return {
      phase: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      progress: 0,
      eatStart: null,
      eatEnd: null,
    };
  });

  // 1秒ごとにタイマーを更新
  useEffect(() => {
    if (!activeSession || activeSession.completed) return;

    const tick = () => {
      const session = deserializeSession(activeSession);
      const state = calcFastingState(session);
      setFastingState(state);

      // セッション終了検知
      if (state.phase === 'idle' && activeSession && !activeSession.completed) {
        const eatEnd = new Date(activeSession.eatWindowEnd).getTime();
        if (Date.now() >= eatEnd) {
          endSession();
        }
      }
    };

    tick(); // 即時実行
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession, endSession]);

  /** 断食を開始する */
  const startFasting = useCallback((protocol?: FastingProtocol, eatHour?: number) => {
    const protocolId = protocol ?? selectedProtocol;
    const hour = eatHour ?? eatStartHour;
    const config = FASTING_PROTOCOLS.find((p) => p.id === protocolId);
    if (!config) return;

    const session = startFastingSession(config, hour);
    setSession(session);
    setEnabled(true);
  }, [selectedProtocol, eatStartHour, setSession, setEnabled]);

  /** 断食を手動終了する */
  const stopFasting = useCallback(() => {
    endSession();
    setFastingState({
      phase: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      progress: 0,
      eatStart: null,
      eatEnd: null,
    });
  }, [endSession]);

  /** セッションをリセット（新規開始のため） */
  const resetSession = useCallback(() => {
    setSession(null);
    setFastingState({
      phase: 'idle',
      remainingSeconds: 0,
      totalSeconds: 0,
      progress: 0,
      eatStart: null,
      eatEnd: null,
    });
  }, [setSession]);

  const isActive = !!activeSession && !activeSession.completed;
  const selectedProtocolConfig = FASTING_PROTOCOLS.find((p) => p.id === selectedProtocol);

  return {
    fastingState,
    isActive,
    isEnabled,
    activeSession: activeSession ? deserializeSession(activeSession) : null,
    selectedProtocol,
    selectedProtocolConfig,
    eatStartHour,
    startFasting,
    stopFasting,
    resetSession,
    setProtocol,
    setEatStartHour,
    setEnabled,
    protocols: FASTING_PROTOCOLS,
  };
}

/**
 * AsyncStorageから復元したセッションのDateフィールドを変換
 */
function deserializeSession(session: FastingSession): FastingSession {
  return {
    ...session,
    windowStart: new Date(session.windowStart),
    windowEnd: new Date(session.windowEnd),
    eatWindowEnd: new Date(session.eatWindowEnd),
  };
}
