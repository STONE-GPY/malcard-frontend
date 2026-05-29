/* eslint-disable @typescript-eslint/no-explicit-any */
import rawCards from './cards.json';
import type { Situation } from '../types';

// We filter out the items that have the 'dialogue' and 'puzzles' keys to identify them as situations.
export const mockBackendSituations: Situation[] = (rawCards as any[]).filter(
  (item) => item.dialogue && item.puzzles
) as Situation[];

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Map the backend Situation items to include shuffled initialWords for puzzles.
// Also infer difficulty from level if not present.
export const situations: Situation[] = mockBackendSituations.map((sit) => {
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (sit.level === 1) difficulty = 'easy';
  if (sit.level >= 3) difficulty = 'hard';

  return {
    ...sit,
    difficulty: sit.difficulty || difficulty,
    puzzles: sit.puzzles.map((puzzle) => {
      // Create initialWords by shuffling the answer array.
      // Make sure the shuffled array is not exactly the same as the answer,
      // unless the answer has only 1 word.
      let initialWords = shuffleArray(puzzle.answer);
      if (puzzle.answer.length > 1) {
        let attempts = 0;
        while (
          JSON.stringify(initialWords) === JSON.stringify(puzzle.answer) &&
          attempts < 5
        ) {
          initialWords = shuffleArray(puzzle.answer);
          attempts++;
        }
      }
      return {
        ...puzzle,
        initialWords,
      };
    }),
  };
});
