import type { CardAttempt, CardHistory, DailyGoal } from '../stores/useHistoryStore';
import { todayKey } from '../stores/useHistoryStore';

export interface SessionEntry {
  cardId: string;
  korean: string;
  type?: string;
  score: number;
  attemptedAt: number;
  delta: number; // score change vs previous attempt of same card; 0 when first
}

export interface DayBucket {
  d: string; // weekday short label (Mon..Sun in Korean)
  m: number; // attempt count for that day (placeholder for minutes)
  avg: number;
  today: boolean;
  date: string; // ISO date key
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function flattenSessions(history: Record<string, CardHistory>): SessionEntry[] {
  const out: SessionEntry[] = [];
  for (const [cardId, h] of Object.entries(history)) {
    h.attempts.forEach((a, idx) => {
      const prev = h.attempts[idx - 1];
      const delta = prev ? a.score - prev.score : 0;
      out.push({
        cardId,
        korean: a.korean ?? h.korean ?? cardId,
        type: a.type ?? h.type,
        score: a.score,
        attemptedAt: a.attemptedAt,
        delta,
      });
    });
  }
  return out.sort((a, b) => b.attemptedAt - a.attemptedAt);
}

export function dayLabelForToday(ts: number, now: Date = new Date()): string {
  const d = new Date(ts);
  const ymd = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const ymdNow = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const ymdYst = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (ymd === ymdNow) return 'today';
  if (ymd === ymdYst) return 'yesterday';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function timeOf(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function weekActivity(history: Record<string, CardHistory>, now: Date = new Date()): DayBucket[] {
  // Last 7 days, oldest first.
  const buckets: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dateKey = todayKey(day);
    const isoIdx = day.getDay();
    let count = 0;
    let scoreSum = 0;
    for (const h of Object.values(history)) {
      for (const a of h.attempts) {
        if (a.attemptedAt >= day.getTime() && a.attemptedAt < next.getTime()) {
          count += 1;
          scoreSum += a.score;
        }
      }
    }
    buckets.push({
      d: WEEKDAY_LABELS[isoIdx],
      m: count,
      avg: count > 0 ? Math.round(scoreSum / count) : 0,
      today: i === 0,
      date: dateKey,
    });
  }
  return buckets;
}

export function streakDays(history: Record<string, CardHistory>, now: Date = new Date()): number {
  // A "streak" day = at least one attempt that day, counting back from today.
  const days = new Set<string>();
  for (const h of Object.values(history)) {
    for (const a of h.attempts) {
      const d = new Date(a.attemptedAt);
      days.add(todayKey(d));
    }
  }
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  while (days.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function totalAttempts(history: Record<string, CardHistory>): number {
  return Object.values(history).reduce((acc, h) => acc + h.attempts.length, 0);
}

export function totalUniqueCardsLearned(history: Record<string, CardHistory>): number {
  return Object.keys(history).length;
}

export function averageBestScore(history: Record<string, CardHistory>): number {
  const scores = Object.values(history).map((h) => h.bestScore);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Today's progress against the configured daily goal.
export interface DailyProgress {
  count: number; // attempts today
  avgScore: number;
  achieved: boolean;
  ratio: number; // 0..1
  current: number; // value the goal is checking (count or avgScore)
  target: number;
}

export function dailyProgress(
  history: Record<string, CardHistory>,
  goal: DailyGoal,
  now: Date = new Date(),
): DailyProgress {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const next = new Date(start);
  next.setDate(next.getDate() + 1);

  let count = 0;
  let scoreSum = 0;
  for (const h of Object.values(history)) {
    for (const a of h.attempts) {
      if (a.attemptedAt >= start.getTime() && a.attemptedAt < next.getTime()) {
        count += 1;
        scoreSum += a.score;
      }
    }
  }
  const avg = count > 0 ? Math.round(scoreSum / count) : 0;
  const current = goal.type === 'cardCount' ? count : avg;
  const ratio = goal.target > 0 ? Math.min(1, current / goal.target) : 0;
  return {
    count,
    avgScore: avg,
    current,
    target: goal.target,
    achieved: current >= goal.target,
    ratio,
  };
}

export function recentAttempts(history: Record<string, CardHistory>, cardId: string): CardAttempt[] {
  return history[cardId]?.attempts ?? [];
}

// Achievement definitions are computed against history snapshot.
export interface AchievementState {
  id: string;
  emoji: string;
  nameKey: string;
  subKey: string;
  earned: boolean;
  progress: number; // 0..1
}

export function achievementStates(history: Record<string, CardHistory>, streak: number): AchievementState[] {
  const sessions = Object.values(history);
  const total = totalAttempts(history);
  const ninetyPlusCount = sessions.flatMap((h) => h.attempts).filter((a) => a.score >= 90).length;
  const learned = totalUniqueCardsLearned(history);

  return [
    {
      id: 'streak7',
      emoji: '🔥',
      nameKey: 'achv.streak7.name',
      subKey: 'achv.streak7.sub',
      earned: streak >= 7,
      progress: Math.min(1, streak / 7),
    },
    {
      id: 'accuracy10',
      emoji: '🎯',
      nameKey: 'achv.accuracy10.name',
      subKey: 'achv.accuracy10.sub',
      earned: ninetyPlusCount >= 10,
      progress: Math.min(1, ninetyPlusCount / 10),
    },
    {
      id: 'first',
      emoji: '🌱',
      nameKey: 'achv.first.name',
      subKey: 'achv.first.sub',
      earned: total >= 1,
      progress: Math.min(1, total / 1),
    },
    {
      id: 'cards20',
      emoji: '📚',
      nameKey: 'achv.cards20.name',
      subKey: 'achv.cards20.sub',
      earned: learned >= 20,
      progress: Math.min(1, learned / 20),
    },
    {
      id: 'cards50',
      emoji: '🏆',
      nameKey: 'achv.cards50.name',
      subKey: 'achv.cards50.sub',
      earned: learned >= 50,
      progress: Math.min(1, learned / 50),
    },
    {
      id: 'attempts100',
      emoji: '🚀',
      nameKey: 'achv.attempts100.name',
      subKey: 'achv.attempts100.sub',
      earned: total >= 100,
      progress: Math.min(1, total / 100),
    },
  ];
}
