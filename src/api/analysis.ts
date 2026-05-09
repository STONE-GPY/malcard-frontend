import { apiFetch, useMockApi } from './client';
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
  if (useMockApi()) {
    throw new Error('postFullAnalysis called while mock mode is enabled');
  }
  const form = new FormData();
  // Filename suffix matters: backend uses os.path.splitext(audio.filename)
  // to choose the temp file extension. WAV ensures the prosody pipeline
  // (parselmouth) can read it. useRecorder transcodes to WAV before this
  // call, but we still set the filename to match the actual MIME type.
  const isWav = req.audio.type === 'audio/wav' || req.audio.type === 'audio/wave';
  const filename = isWav ? 'record.wav' : 'record.webm';
  form.append('audio', req.audio, filename);
  form.append('reference_text', req.referenceText);
  form.append('profile', req.profile ?? 'ru');
  return apiFetch<BackendFullResponse>('/analysis/full', {
    method: 'POST',
    body: form,
    signal: req.signal,
  });
}
