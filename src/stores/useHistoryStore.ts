import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CardAttempt {
  score: number;
  attemptedAt: number;
}

export interface CardHistory {
  attempts: CardAttempt[];
  bestScore: number;
  lastAttemptAt: number;
}

interface HistoryStore {
  history: Record<string, CardHistory>;
  favorites: string[];
  recordAttempt: (cardId: string | number, score: number) => void;
  toggleFavorite: (cardId: string | number) => void;
  isFavorite: (cardId: string | number) => boolean;
  getHistory: (cardId: string | number) => CardHistory | null;
  reviewQueueIds: (threshold?: number) => string[];
  clearAll: () => void;
}

const MAX_ATTEMPTS_KEPT = 20;

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: {},
      favorites: [],

      recordAttempt: (cardId, score) => {
        const key = String(cardId);
        const now = Date.now();
        set((state) => {
          const prev = state.history[key];
          const attempts = [
            ...(prev?.attempts ?? []),
            { score, attemptedAt: now },
          ].slice(-MAX_ATTEMPTS_KEPT);
          const bestScore = Math.max(score, prev?.bestScore ?? 0);
          return {
            history: {
              ...state.history,
              [key]: { attempts, bestScore, lastAttemptAt: now },
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
    }),
    {
      name: 'malcard-history',
      version: 1,
    },
  ),
);
