import { describe, expect, it } from 'vitest';
import {
  averageBestScore,
  dailyProgress,
  flattenSessions,
  streakDays,
  totalAttempts,
  totalUniqueCardsLearned,
  weekActivity,
  achievementStates,
} from './stats';
import type { CardHistory } from '../stores/useHistoryStore';

const startOfDay = (offsetDays: number, now: Date) => {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.getTime();
};

const NOW = new Date('2026-05-04T15:00:00.000Z');

const fixture: Record<string, CardHistory> = {
  life_01: {
    bestScore: 92,
    lastAttemptAt: startOfDay(0, NOW),
    korean: '안녕하세요',
    type: '생활문장',
    attempts: [
      { score: 70, attemptedAt: startOfDay(2, NOW), korean: '안녕하세요', type: '생활문장' },
      { score: 84, attemptedAt: startOfDay(1, NOW), korean: '안녕하세요', type: '생활문장' },
      { score: 92, attemptedAt: startOfDay(0, NOW), korean: '안녕하세요', type: '생활문장' },
    ],
  },
  life_02: {
    bestScore: 88,
    lastAttemptAt: startOfDay(0, NOW),
    korean: '감사합니다',
    type: '생활문장',
    attempts: [
      { score: 60, attemptedAt: startOfDay(0, NOW), korean: '감사합니다', type: '생활문장' },
      { score: 88, attemptedAt: startOfDay(0, NOW) + 1000, korean: '감사합니다', type: '생활문장' },
    ],
  },
};

describe('stats', () => {
  it('flattenSessions sorts by attemptedAt desc and computes delta', () => {
    const sessions = flattenSessions(fixture);
    expect(sessions[0].score).toBe(88);
    expect(sessions[0].delta).toBe(28); // 88 - 60
    expect(sessions[sessions.length - 1].score).toBe(70);
  });

  it('totalAttempts and totalUniqueCardsLearned are correct', () => {
    expect(totalAttempts(fixture)).toBe(5);
    expect(totalUniqueCardsLearned(fixture)).toBe(2);
  });

  it('averageBestScore averages bestScores', () => {
    expect(averageBestScore(fixture)).toBe(90); // (92+88)/2
  });

  it('streakDays counts consecutive days back from now', () => {
    expect(streakDays(fixture, NOW)).toBe(3); // today, yesterday, day-2
  });

  it('weekActivity has 7 buckets and marks today', () => {
    const w = weekActivity(fixture, NOW);
    expect(w).toHaveLength(7);
    const today = w.find((b) => b.today);
    expect(today).toBeTruthy();
    // life_01[2]=92 today, life_02[0]=60 today, life_02[1]=88 today
    expect(today!.m).toBe(3);
  });

  it('dailyProgress reports cardCount goal correctly', () => {
    const p = dailyProgress(fixture, { type: 'cardCount', target: 3 }, NOW);
    expect(p.count).toBe(3);
    expect(p.achieved).toBe(true);

    const p2 = dailyProgress(fixture, { type: 'cardCount', target: 5 }, NOW);
    expect(p2.achieved).toBe(false);
  });

  it('dailyProgress reports avgScore goal correctly', () => {
    const p = dailyProgress(fixture, { type: 'avgScore', target: 85 }, NOW);
    // today has scores 92, 60, 88 → avg 80
    expect(p.avgScore).toBe(80);
    expect(p.achieved).toBe(false);
  });

  it('achievementStates flags first attempt and 90+ progress', () => {
    const ach = achievementStates(fixture, 3);
    const first = ach.find((a) => a.id === 'first');
    expect(first?.earned).toBe(true);
    const acc = ach.find((a) => a.id === 'accuracy10');
    // 92 is the only 90+ attempt
    expect(acc?.progress).toBeCloseTo(0.1, 5);
  });
});
