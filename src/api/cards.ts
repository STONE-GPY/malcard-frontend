import { mockBackendCards } from '../data/cards';
import { loadCustomPhonemeCards } from '../data/adminCards';
import type { BackendCard, Card } from '../types';
import { decorateCard } from './mappers';

// Static dataset + cards authored via the local /admin page (localStorage).
// Recomputed on each call so a card added in the admin tab shows up on the
// next home visit without a reload.
function allPhonemeCards(): BackendCard[] {
  return [...(mockBackendCards as BackendCard[]), ...loadCustomPhonemeCards()];
}

export interface CardsListResponse {
  items: BackendCard[];
  total: number;
  limit: number;
  offset: number;
}

interface ListCardsParams {
  type?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export async function listCards(params: ListCardsParams = {}): Promise<CardsListResponse> {
  // The backend /cards endpoint was redesigned (v3) and now serves situation
  // cards (dialogue + puzzles structure). Phoneme practice cards exist only as
  // local static data. Always serve from local mock so the card-learn flow
  // keeps working regardless of mock-mode setting.
  return mockListCards(params);
}

export async function getCard(id: string): Promise<BackendCard> {
  // Phoneme cards are local-only (see listCards), so resolve from the merged
  // static + admin-authored set rather than the backend /cards/:id endpoint.
  const found = allPhonemeCards().find((c) => c.id === id);
  if (!found) throw new Error('CARD_NOT_FOUND');
  return found;
}

function mockListCards({ type, limit = 20, offset = 0 }: ListCardsParams): CardsListResponse {
  const all = allPhonemeCards();
  const filtered = type ? all.filter((c) => c.type === type) : all;
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  };
}

export function toUiCards(items: BackendCard[]): Card[] {
  return items.map(decorateCard);
}
