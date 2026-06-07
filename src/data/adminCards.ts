// Cards authored through the local /admin page.
//
// Source of truth is the dev server (see malcardAdminPersist in vite.config.ts):
// a save POSTs to /__admin/custom-cards, which writes JSON files on disk
// (src/data/custom-*.json). Those files are PERMANENT -- committable and served
// to every client (incl. phones over the tunnel) via the GET endpoint, which the
// card loaders merge on top of the static dataset.
//
// localStorage is kept as an offline cache + fallback for when that endpoint
// isn't there (production/preview builds, or the Playwright test server, which
// sets VITE_API_BASE_URL so the dev endpoint stays off). In that case authoring
// degrades gracefully to this-browser-only, exactly as before.
import type { BackendCard, Situation } from '../types';

const PHONEME_KEY = 'malcard-admin-phoneme-cards';
const SITUATION_KEY = 'malcard-admin-situations';
const ADMIN_API = '/__admin/custom-cards';

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

// ── Disk-backed store (dev endpoint) ──────────────────────────────────────────
type RemoteCards = { phoneme: BackendCard[]; situations: Situation[] };
let remoteState: 'unknown' | 'ok' | 'down' = 'unknown';
let remoteCache: RemoteCards | null = null;
let remotePending: Promise<RemoteCards | null> | null = null;

async function fetchRemote(): Promise<RemoteCards | null> {
  if (remoteState === 'down') return null;
  if (remoteState === 'ok' && remoteCache) return remoteCache;
  if (typeof window === 'undefined') return null;
  if (!remotePending) {
    remotePending = (async () => {
      try {
        const res = await fetch(ADMIN_API, { headers: { Accept: 'application/json' } });
        const ct = res.headers.get('content-type') ?? '';
        if (!res.ok || !ct.includes('application/json')) throw new Error('unavailable');
        const data = (await res.json()) as Partial<RemoteCards>;
        const remote: RemoteCards = {
          phoneme: Array.isArray(data.phoneme) ? data.phoneme : [],
          situations: Array.isArray(data.situations) ? data.situations : [],
        };
        // One-time migration: if disk is empty but this browser has cards from
        // the old localStorage-only era, push them up so they become permanent.
        const lsP = readArray<BackendCard>(PHONEME_KEY);
        const lsS = readArray<Situation>(SITUATION_KEY);
        if (remote.phoneme.length === 0 && lsP.length > 0) {
          await postRemote('phoneme', lsP);
          remote.phoneme = lsP;
        }
        if (remote.situations.length === 0 && lsS.length > 0) {
          await postRemote('situation', lsS);
          remote.situations = lsS;
        }
        // Mirror disk truth into localStorage so the sync fallbacks and the
        // add/remove diffing below stay in sync with what's persisted.
        writeArray(PHONEME_KEY, remote.phoneme);
        writeArray(SITUATION_KEY, remote.situations);
        remoteState = 'ok';
        remoteCache = remote;
        return remote;
      } catch {
        remoteState = 'down';
        remoteCache = null;
        return null;
      } finally {
        remotePending = null;
      }
    })();
  }
  return remotePending;
}

async function postRemote(kind: 'phoneme' | 'situation', items: unknown[]): Promise<void> {
  if (typeof window === 'undefined' || remoteState === 'down') return;
  try {
    const res = await fetch(ADMIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, items }),
    });
    if (!res.ok) return; // e.g. 403 over the tunnel, or endpoint absent
    if (remoteCache) {
      if (kind === 'phoneme') remoteCache.phoneme = items as BackendCard[];
      else remoteCache.situations = items as Situation[];
    }
  } catch {
    /* endpoint unavailable — the localStorage cache already holds the change */
  }
}

// ── Phoneme practice cards (BackendCard shape) ────────────────────────────────
// Sync read = localStorage cache (kept in sync with disk by fetchRemote). Used
// as the immediate fallback; prefer the async variant where an await is possible.
export function loadCustomPhonemeCards(): BackendCard[] {
  return readArray<BackendCard>(PHONEME_KEY);
}

export async function loadCustomPhonemeCardsAsync(): Promise<BackendCard[]> {
  const remote = await fetchRemote();
  return remote ? remote.phoneme : loadCustomPhonemeCards();
}

export async function addCustomPhonemeCard(card: BackendCard): Promise<BackendCard[]> {
  const next = [...loadCustomPhonemeCards().filter((c) => c.id !== card.id), card];
  writeArray(PHONEME_KEY, next);
  await postRemote('phoneme', next);
  return next;
}

export async function removeCustomPhonemeCard(id: string): Promise<BackendCard[]> {
  const next = loadCustomPhonemeCards().filter((c) => c.id !== id);
  writeArray(PHONEME_KEY, next);
  await postRemote('phoneme', next);
  return next;
}

// ── Situation cards (Situation shape) ─────────────────────────────────────────
export function loadCustomSituations(): Situation[] {
  return readArray<Situation>(SITUATION_KEY);
}

export async function loadCustomSituationsAsync(): Promise<Situation[]> {
  const remote = await fetchRemote();
  return remote ? remote.situations : loadCustomSituations();
}

export async function addCustomSituation(situation: Situation): Promise<Situation[]> {
  const next = [...loadCustomSituations().filter((s) => s.id !== situation.id), situation];
  writeArray(SITUATION_KEY, next);
  await postRemote('situation', next);
  return next;
}

export async function removeCustomSituation(id: string): Promise<Situation[]> {
  const next = loadCustomSituations().filter((s) => s.id !== id);
  writeArray(SITUATION_KEY, next);
  await postRemote('situation', next);
  return next;
}

// Stable-ish id from a prefix + the current time. Date.now() keeps it unique
// across sessions; the admin page runs in a real browser so the clock is
// available here (unlike workflow scripts).
export function makeCustomId(prefix: string): string {
  return `custom_${prefix}_${Date.now().toString(36)}`;
}
