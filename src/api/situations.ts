import { getSituationById, loadSituations } from '../data/situations';
import type { Situation } from '../types';

export interface SituationsListResponse {
  items: Situation[];
  total: number;
}

export async function listSituations(): Promise<SituationsListResponse> {
  const items = await loadSituations();
  return { items, total: items.length };
}

export async function getSituation(id: string): Promise<Situation> {
  const found = await getSituationById(id);
  if (!found) {
    throw new Error('SITUATION_NOT_FOUND');
  }
  return found;
}
