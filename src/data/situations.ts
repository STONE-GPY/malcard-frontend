/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Situation } from '../types';

// The situation dataset (~200KB) lives in cards.json (legacy name — actually
// holds 80 situations, not cards). We load it via dynamic import so it is
// emitted as a separate chunk instead of being inlined into the main bundle.
// First call resolves the chunk; subsequent calls hit the in-memory cache.

let cache: Situation[] | null = null;
let pending: Promise<Situation[]> | null = null;

function inferDifficulty(level: number | undefined): 'easy' | 'medium' | 'hard' {
  if (level === 1) return 'easy';
  if (level !== undefined && level >= 3) return 'hard';
  return 'medium';
}

export function loadSituations(): Promise<Situation[]> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = import('./cards.json').then((mod) => {
    const raw = (mod.default as any[]).filter(
      (item) => item.dialogue && item.puzzles,
    );
    cache = raw.map((sit) => ({
      ...sit,
      difficulty: sit.difficulty || inferDifficulty(sit.level),
    })) as Situation[];
    pending = null;
    return cache;
  });
  return pending;
}

export async function getSituationById(id: string): Promise<Situation | undefined> {
  const list = await loadSituations();
  return list.find((s) => s.id === id);
}
