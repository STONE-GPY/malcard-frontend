import { situations } from '../data/situations';
import type { Situation } from '../types';

export interface SituationsListResponse {
  items: Situation[];
  total: number;
}

export async function listSituations(): Promise<SituationsListResponse> {
  // In a real app this might fetch from an endpoint. Here we return the mock data directly since the frontend manages the lists now.
  return {
    items: situations,
    total: situations.length,
  };
}

export async function getSituation(id: string): Promise<Situation> {
  const found = situations.find((s) => s.id === id);
  if (!found) {
    throw new Error('SITUATION_NOT_FOUND');
  }
  return found;
}
