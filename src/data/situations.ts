/* eslint-disable @typescript-eslint/no-explicit-any */
import rawCards from './cards.json';
import type { Situation } from '../types';

// We filter out the items that have the 'dialogue' and 'puzzles' keys to identify them as situations.
export const mockBackendSituations: Situation[] = (rawCards as any[]).filter(
  (item) => item.dialogue && item.puzzles
) as Situation[];



// Map the backend Situation items to include shuffled initialWords for puzzles.
// Also infer difficulty from level if not present.
export const situations: Situation[] = mockBackendSituations.map((sit) => {
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (sit.level === 1) difficulty = 'easy';
  if (sit.level >= 3) difficulty = 'hard';

  return {
    ...sit,
    difficulty: sit.difficulty || difficulty,
    puzzles: sit.puzzles,
  };
});
