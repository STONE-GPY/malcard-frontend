// Custom cards authored through the local /admin page. There is no backend or
// DB in this app, so authored cards live in localStorage and are merged into
// the static datasets at load time (see api/cards.ts and data/situations.ts).
// The admin page can also export them as JSON for a developer to fold into the
// static source files (src/data/cards.ts, src/data/cards.json) permanently.
import type { BackendCard, Situation } from '../types';

const PHONEME_KEY = 'malcard-admin-phoneme-cards';
const SITUATION_KEY = 'malcard-admin-situations';

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* quota exceeded / private mode — silently ignore */
  }
}

// ── Phoneme practice cards (BackendCard shape) ────────────────────────────────
export function loadCustomPhonemeCards(): BackendCard[] {
  return readArray<BackendCard>(PHONEME_KEY);
}

export function addCustomPhonemeCard(card: BackendCard): BackendCard[] {
  const next = [...loadCustomPhonemeCards().filter((c) => c.id !== card.id), card];
  writeArray(PHONEME_KEY, next);
  return next;
}

export function removeCustomPhonemeCard(id: string): BackendCard[] {
  const next = loadCustomPhonemeCards().filter((c) => c.id !== id);
  writeArray(PHONEME_KEY, next);
  return next;
}

// ── Situation cards (Situation shape) ─────────────────────────────────────────
export function loadCustomSituations(): Situation[] {
  return readArray<Situation>(SITUATION_KEY);
}

export function addCustomSituation(situation: Situation): Situation[] {
  const next = [
    ...loadCustomSituations().filter((s) => s.id !== situation.id),
    situation,
  ];
  writeArray(SITUATION_KEY, next);
  return next;
}

export function removeCustomSituation(id: string): Situation[] {
  const next = loadCustomSituations().filter((s) => s.id !== id);
  writeArray(SITUATION_KEY, next);
  return next;
}

// Stable-ish id from a prefix + the current custom count. Date.now() keeps it
// unique across sessions; the admin page runs in a real browser so the clock
// is available here (unlike workflow scripts).
export function makeCustomId(prefix: string): string {
  return `custom_${prefix}_${Date.now().toString(36)}`;
}
