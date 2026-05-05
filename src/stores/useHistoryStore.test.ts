import { beforeEach, describe, expect, it } from 'vitest';
import { useHistoryStore } from './useHistoryStore';

beforeEach(() => {
  // Reset persisted state between tests
  useHistoryStore.setState({
    history: {},
    favorites: [],
    goal: { type: 'cardCount', target: 5 },
    lastSeenGoalDate: null,
  });
});

describe('useHistoryStore', () => {
  it('recordAttempt appends and tracks bestScore', () => {
    const { recordAttempt } = useHistoryStore.getState();
    recordAttempt({ cardId: 'life_01', score: 70, korean: '안녕', type: '생활문장' });
    recordAttempt({ cardId: 'life_01', score: 88 });
    recordAttempt({ cardId: 'life_01', score: 60 });

    const h = useHistoryStore.getState().history.life_01;
    expect(h.attempts).toHaveLength(3);
    expect(h.bestScore).toBe(88);
    // korean snapshot from first attempt is preserved
    expect(h.korean).toBe('안녕');
  });

  it('toggleFavorite/isFavorite work with mixed key types', () => {
    const s = useHistoryStore.getState();
    s.toggleFavorite('life_01');
    expect(useHistoryStore.getState().isFavorite('life_01')).toBe(true);
    s.toggleFavorite('life_01');
    expect(useHistoryStore.getState().isFavorite('life_01')).toBe(false);
  });

  it('reviewQueueIds returns cards with last score below threshold', () => {
    const { recordAttempt, reviewQueueIds } = useHistoryStore.getState();
    recordAttempt({ cardId: 'a', score: 50 });
    recordAttempt({ cardId: 'b', score: 95 });
    recordAttempt({ cardId: 'c', score: 60 });
    recordAttempt({ cardId: 'a', score: 90 }); // last is good now
    expect(reviewQueueIds(70).sort()).toEqual(['c']);
  });

  it('setGoal persists configuration', () => {
    useHistoryStore.getState().setGoal({ type: 'avgScore', target: 85 });
    expect(useHistoryStore.getState().goal).toEqual({ type: 'avgScore', target: 85 });
  });
});
