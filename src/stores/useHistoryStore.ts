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
  recordAttempt: (cardId: string, score: number) => void;
  toggleFavorite: (cardId: string) => void;
  isFavorite: (cardId: string) => boolean;
  getHistory: (cardId: string) => CardHistory | null;
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
        const now = Date.now();
        set((state) => {
          const prev = state.history[cardId];
          const attempts = [
            ...(prev?.attempts ?? []),
            { score, attemptedAt: now },
          ].slice(-MAX_ATTEMPTS_KEPT);
          const bestScore = Math.max(score, prev?.bestScore ?? 0);
          return {
            history: {
              ...state.history,
              [cardId]: { attempts, bestScore, lastAttemptAt: now },
            },
          };
        });
      },

      toggleFavorite: (cardId) => {
        set((state) => ({
          favorites: state.favorites.includes(cardId)
            ? state.favorites.filter((id) => id !== cardId)
            : [...state.favorites, cardId],
        }));
      },

      isFavorite: (cardId) => get().favorites.includes(cardId),

      getHistory: (cardId) => get().history[cardId] ?? null,

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
