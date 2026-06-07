/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Situation } from '../types';
import { loadCustomSituationsAsync } from './adminCards';

// Situation dataset lives in cards.json (80 situations, dialogue + puzzles).
// This file is kept in sync with the backend's cards.json (identical content),
// so loading locally reflects the same data the backend /cards endpoint serves
// while avoiding a runtime network dependency for the situations tab.
// Loaded via dynamic import so it ships as a separate chunk.
//
// Cards authored via the local /admin page (localStorage) are merged on top of
// the static set on every call, so a newly added situation appears on the next
// visit to the situations tab without a reload.

let baseCache: Situation[] | null = null;
let pending: Promise<Situation[]> | null = null;

function inferDifficulty(level: number | undefined): 'easy' | 'medium' | 'hard' {
  if (level === 1) return 'easy';
  if (level !== undefined && level >= 3) return 'hard';
  return 'medium';
}

function withDifficulty(sit: any): Situation {
  return {
    ...sit,
    difficulty: sit.difficulty || inferDifficulty(sit.level),
  } as Situation;
}

async function loadBaseSituations(): Promise<Situation[]> {
  if (baseCache) return baseCache;
  if (!pending) {
    pending = import('./cards.json').then((mod) => {
      const raw = (mod.default as any[]).filter(
        (item) => item.dialogue && item.puzzles,
      );
      baseCache = raw.map(withDifficulty);
      pending = null;
      return baseCache;
    });
  }
  return pending;
}

export async function loadSituations(): Promise<Situation[]> {
  const base = await loadBaseSituations();
  const custom = (await loadCustomSituationsAsync()).map(withDifficulty);
  return [...base, ...custom];
}

export async function getSituationById(id: string): Promise<Situation | undefined> {
  const list = await loadSituations();
  return list.find((s) => s.id === id);
}
