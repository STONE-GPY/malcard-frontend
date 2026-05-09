import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CardAttempt {
  score: number;
  attemptedAt: number;
  korean?: string; // snapshot at the time of attempt
  type?: string;
}

export interface CardHistory {
  attempts: CardAttempt[];
  bestScore: number;
  lastAttemptAt: number;
  korean?: string;
  type?: string;
}

export type DailyGoalType = 'cardCount' | 'avgScore';

export interface DailyGoal {
  type: DailyGoalType;
  target: number;
}

const DEFAULT_GOAL: DailyGoal = { type: 'cardCount', target: 5 };

interface RecordAttemptInput {
  cardId: string | number;
  score: number;
  korean?: string;
  type?: string;
}

interface HistoryStore {
  history: Record<string, CardHistory>;
  favorites: string[];
  goal: DailyGoal;
  lastSeenGoalDate: string | null;

  recordAttempt: (input: RecordAttemptInput) => void;
  toggleFavorite: (cardId: string | number) => void;
  isFavorite: (cardId: string | number) => boolean;
  getHistory: (cardId: string | number) => CardHistory | null;
  reviewQueueIds: (threshold?: number) => string[];
  clearAll: () => void;
  setGoal: (goal: DailyGoal) => void;
  markGoalSeenToday: () => void;
}

const MAX_ATTEMPTS_KEPT = 50;

function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: {},
      favorites: [],
      goal: DEFAULT_GOAL,
      lastSeenGoalDate: null,

      recordAttempt: ({ cardId, score, korean, type }) => {
        const key = String(cardId);
        const now = Date.now();
        set((state) => {
          const prev = state.history[key];
          const attempts = [
            ...(prev?.attempts ?? []),
            { score, attemptedAt: now, korean, type },
          ].slice(-MAX_ATTEMPTS_KEPT);
          const bestScore = Math.max(score, prev?.bestScore ?? 0);
          return {
            history: {
              ...state.history,
              [key]: {
                attempts,
                bestScore,
                lastAttemptAt: now,
                korean: korean ?? prev?.korean,
                type: type ?? prev?.type,
              },
            },
          };
        });
      },

      toggleFavorite: (cardId) => {
        const key = String(cardId);
        set((state) => ({
          favorites: state.favorites.includes(key)
            ? state.favorites.filter((id) => id !== key)
            : [...state.favorites, key],
        }));
      },

      isFavorite: (cardId) => get().favorites.includes(String(cardId)),
      getHistory: (cardId) => get().history[String(cardId)] ?? null,

      reviewQueueIds: (threshold = 70) => {
        const { history } = get();
        return Object.entries(history)
          .filter(([, h]) => {
            const last = h.attempts[h.attempts.length - 1];
            return last && last.score < threshold;
          })
          .sort((a, b) => a[1].lastAttemptAt - b[1].lastAttemptAt)
          .map(([id]) => id);
      },

      clearAll: () => set({ history: {}, favorites: [] }),
      setGoal: (goal) => set({ goal }),
      markGoalSeenToday: () => set({ lastSeenGoalDate: todayKey() }),
    }),
    {
      name: 'malcard-history',
      version: 2,
    },
  ),
);

export { todayKey };
