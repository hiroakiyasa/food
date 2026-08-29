/**
 * Fasting Engine — 間欠的断食タイマーのビジネスロジック
 *
 * 対応プロトコル:
 * - 16:8  断食16時間 / 食事8時間
 * - 18:6  断食18時間 / 食事6時間
 * - 20:4  断食20時間 / 食事4時間
 * - OMAD  One Meal A Day (断食23時間)
 * - 5:2   週5日通常食 / 週2日500kcal制限
 * - custom カスタム設定
 */

export type FastingProtocol = '16:8' | '18:6' | '20:4' | 'OMAD' | '5:2' | 'custom';

export interface FastingProtocolConfig {
  id: FastingProtocol;
  label: string;
  description: string;
  fastHours: number;
  eatHours: number;
  emoji: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const FASTING_PROTOCOLS: FastingProtocolConfig[] = [
  {
    id: '16:8',
    label: '16:8',
    description: '最も人気のある断食法。16時間断食、8時間食事ウィンドウ。',
    fastHours: 16,
    eatHours: 8,
    emoji: '🌙',
    difficulty: 'beginner',
  },
  {
    id: '18:6',
    label: '18:6',
    description: '18時間断食、6時間食事ウィンドウ。より高い効果が期待できる。',
    fastHours: 18,
    eatHours: 6,
    emoji: '⭐',
    difficulty: 'intermediate',
  },
  {
    id: '20:4',
    label: '20:4 (Warrior Diet)',
    description: '20時間断食、4時間食事ウィンドウ。戦士の食事法。',
    fastHours: 20,
    eatHours: 4,
    emoji: '⚔️',
    difficulty: 'advanced',
  },
  {
    id: 'OMAD',
    label: 'OMAD',
    description: '1日1食のみ。最も厳格な時間制限食。',
    fastHours: 23,
    eatHours: 1,
    emoji: '🎯',
    difficulty: 'advanced',
  },
  {
    id: '5:2',
    label: '5:2',
    description: '週5日通常食、週2日は500kcal以内に制限。',
    fastHours: 0,
    eatHours: 24,
    emoji: '📅',
    difficulty: 'intermediate',
  },
];

export interface FastingSession {
  id?: string;
  userId?: string;
  protocol: FastingProtocol;
  fastHours: number;
  eatHours: number;
  windowStart: Date; // 断食開始
  windowEnd: Date;   // 断食終了予定（=食事ウィンドウ開始）
  eatWindowEnd: Date; // 食事ウィンドウ終了
  completed: boolean;
}

export interface FastingState {
  phase: 'fasting' | 'eating' | 'idle';
  /** 断食/食事の残り秒数 */
  remainingSeconds: number;
  /** 断食/食事の総秒数 */
  totalSeconds: number;
  /** 進捗 0〜1 */
  progress: number;
  /** 食事ウィンドウ開始時刻 */
  eatStart: Date | null;
  /** 食事ウィンドウ終了時刻 */
  eatEnd: Date | null;
}

/**
 * 断食セッションを開始する
 *
 * @param protocol プロトコル設定
 * @param eatStartHour 食事ウィンドウ開始時間 (0-23, デフォルト=12)
 * @returns FastingSession
 */
export function startFastingSession(
  protocol: FastingProtocolConfig,
  eatStartHour: number = 12,
): FastingSession {
  const now = new Date();

  // 食事ウィンドウ終了 = 食事ウィンドウ開始 + eatHours
  const eatWindowStart = new Date(now);
  eatWindowStart.setHours(eatStartHour, 0, 0, 0);
  // もし食事ウィンドウ開始が今より前なら翌日に設定
  if (eatWindowStart <= now) {
    eatWindowStart.setDate(eatWindowStart.getDate() + 1);
  }

  const eatWindowEnd = new Date(eatWindowStart);
  eatWindowEnd.setHours(eatWindowStart.getHours() + protocol.eatHours);

  // 断食終了 = 食事ウィンドウ開始
  // 断食開始 = 断食終了 - fastHours
  const fastWindowEnd = new Date(eatWindowStart);
  const fastWindowStart = new Date(fastWindowEnd);
  fastWindowStart.setHours(fastWindowEnd.getHours() - protocol.fastHours);

  return {
    protocol: protocol.id,
    fastHours: protocol.fastHours,
    eatHours: protocol.eatHours,
    windowStart: fastWindowStart,
    windowEnd: fastWindowEnd,
    eatWindowEnd,
    completed: false,
  };
}

/**
 * 現在の断食状態を計算する
 */
export function calcFastingState(session: FastingSession): FastingState {
  const now = new Date();
  const fastStart = session.windowStart.getTime();
  const fastEnd = session.windowEnd.getTime(); // = 食事ウィンドウ開始
  const eatEnd = session.eatWindowEnd.getTime();
  const nowMs = now.getTime();

  // 断食フェーズ
  if (nowMs >= fastStart && nowMs < fastEnd) {
    const totalMs = fastEnd - fastStart;
    const elapsedMs = nowMs - fastStart;
    const remainingMs = fastEnd - nowMs;
    return {
      phase: 'fasting',
      remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
      totalSeconds: Math.floor(totalMs / 1000),
      progress: Math.min(1, elapsedMs / totalMs),
      eatStart: session.windowEnd,
      eatEnd: session.eatWindowEnd,
    };
  }

  // 食事フェーズ
  if (nowMs >= fastEnd && nowMs < eatEnd) {
    const totalMs = eatEnd - fastEnd;
    const elapsedMs = nowMs - fastEnd;
    const remainingMs = eatEnd - nowMs;
    return {
      phase: 'eating',
      remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
      totalSeconds: Math.floor(totalMs / 1000),
      progress: Math.min(1, elapsedMs / totalMs),
      eatStart: session.windowEnd,
      eatEnd: session.eatWindowEnd,
    };
  }

  // セッション前 or 完了
  return {
    phase: 'idle',
    remainingSeconds: 0,
    totalSeconds: 0,
    progress: 0,
    eatStart: session.windowEnd,
    eatEnd: session.eatWindowEnd,
  };
}

/**
 * 残り秒数を HH:MM:SS 形式にフォーマット
 */
export function formatRemainingTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

/**
 * 時刻を HH:MM 形式にフォーマット
 */
export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
