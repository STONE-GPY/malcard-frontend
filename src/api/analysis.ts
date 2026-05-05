import { apiFetch, USE_MOCK_API } from './client';
import type { BackendFullResponse } from '../types';

export interface FullAnalysisRequest {
  audio: Blob;
  referenceText: string;
  profile?: string;
  signal?: AbortSignal;
}

export async function postFullAnalysis(req: FullAnalysisRequest): Promise<BackendFullResponse> {
  // Mock branch is handled at the analyzer level (mockAnalyzer); this function
  // is only used by httpAnalyzer.
  if (USE_MOCK_API) {
    throw new Error('postFullAnalysis called while VITE_USE_MOCK_API is enabled');
  }
  const form = new FormData();
  form.append('audio', req.audio, 'record.webm');
  form.append('reference_text', req.referenceText);
  form.append('profile', req.profile ?? 'ru');
  return apiFetch<BackendFullResponse>('/analysis/full', {
    method: 'POST',
    body: form,
    signal: req.signal,
  });
}
