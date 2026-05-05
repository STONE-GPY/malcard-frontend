import { apiFetch, USE_MOCK_API } from './client';
import { mockBackendCards } from '../data/cards';
import type { BackendCard, Card } from '../types';
import { decorateCard } from './mappers';

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
  if (USE_MOCK_API) {
    return mockListCards(params);
  }
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  qs.set('limit', String(params.limit ?? 20));
  qs.set('offset', String(params.offset ?? 0));
  return apiFetch<CardsListResponse>(`/cards?${qs.toString()}`, { signal: params.signal });
}

export async function getCard(id: string, signal?: AbortSignal): Promise<BackendCard> {
  if (USE_MOCK_API) {
    const found = mockBackendCards.find((c) => c.id === id);
    if (!found) throw new Error('CARD_NOT_FOUND');
    return found as BackendCard;
  }
  return apiFetch<BackendCard>(`/cards/${encodeURIComponent(id)}`, { signal });
}

function mockListCards({ type, limit = 20, offset = 0 }: ListCardsParams): CardsListResponse {
  const filtered = type
    ? mockBackendCards.filter((c) => c.type === type)
    : mockBackendCards;
  return {
    items: filtered.slice(offset, offset + limit) as BackendCard[],
    total: filtered.length,
    limit,
    offset,
  };
}

export function toUiCards(items: BackendCard[]): Card[] {
  return items.map(decorateCard);
}
