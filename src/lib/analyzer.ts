import type {
  AnalysisResult,
  AnalysisStep,
  BackendIssue,
  BackendFullResponse,
  Card,
  EvaluationStatus,
} from '../types';
import { useMockApi } from '../api/client';
import { postFullAnalysis } from '../api/analysis';
import { mapAnalysisResponse } from '../api/mappers';
import { buildScenarioResponse, getActiveScenario } from './mockScenarios';

export interface AnalyzeOptions {
  onStep?: (step: AnalysisStep) => void;
  signal?: AbortSignal;
}

export interface Analyzer {
  analyze: (audio: Blob, card: Card, options?: AnalyzeOptions) => Promise<AnalysisResult>;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function pseudoRandom(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

// Build a backend-shaped response from a card so the same mapper is used in both modes.
function buildMockBackendResponse(card: Card): BackendFullResponse {
  const rand = pseudoRandom(hashSeed(`${card.id}-${Date.now()}`));
  const reference = card.korean;
  const syls = reference.replace(/[\s?!.,]/g, '').split('');
  const issues: BackendIssue[] = [];
  syls.forEach((ko, idx) => {
    if (rand() < 0.18) {
      issues.push({
        syllable_idx: idx,
        syllable_label: ko,
        target: card.phonemes?.[idx]?.ipa ?? '',
        user: card.phonemes?.[idx]?.ipa ?? '/?/',
        note: '발음을 조금 더 또렷하게 해보세요',
      });
    }
  });
  const overall = Math.round(60 + ((syls.length - issues.length) / Math.max(syls.length, 1)) * 35);
  const evaluation_status: EvaluationStatus = 'ready';

  return {
    phoneme_result: {
      status: { evaluation_status, status_message: 'mock ok' },
      llm_feedback_input: {
        reference_text: reference,
        score_breakdown: {
          overall,
          consonant: overall - 2,
          vowel: overall + 4,
          coda: overall - 5,
          fluency_like: overall * 0.3,
        },
        issues,
      },
    },
    prosody_result: syls.map((ko, idx) => ({
      syllable_idx: idx,
      syllable_label: ko,
      native_start: idx * 0.18,
      learner_start: idx * 0.18 + (rand() - 0.5) * 0.04,
      rmse: 0.3 + rand() * 0.3,
      pearson: 0.6 + rand() * 0.3,
      slope_diff: (rand() - 0.6) * 0.25,
      duration_ratio: 0.95 + rand() * 0.2,
    })),
    pipeline_state: { prosody_executed: true, reason: 'ready' },
  };
}

// onStep callbacks were removed: the previous code synthesized fake "upload →
// phoneme → intonation → feedback" progress signals on a fixed timer, which
// misled users into thinking the pipeline reached "feedback generation" even
// when the backend aborted at the audio gate. The LoadingPage now shows an
// indeterminate progress bar. The Analyzer.onStep callback is kept in the
// interface so a future SSE/WebSocket-capable backend can reintroduce real
// per-stage signals without changing call sites.

export const mockAnalyzer: Analyzer = {
  async analyze(_audio, card, { signal } = {}) {
    const scenario = getActiveScenario();
    // Single artificial delay simulates "the work is happening" without
    // pretending to know how far along it is.
    await wait(2300, signal);
    const backend = await buildScenarioResponse(scenario, {
      card,
      defaultBuilder: buildMockBackendResponse,
    });
    return mapAnalysisResponse(backend, card.korean);
  },
};

export const httpAnalyzer: Analyzer = {
  async analyze(audio, card, { signal } = {}) {
    const res = await postFullAnalysis({
      audio,
      referenceText: card.korean,
      profile: 'ru',
      signal,
    });
    return mapAnalysisResponse(res, card.korean);
  },
};

// Resolve at call time so the in-app dev panel toggle takes effect immediately
// (USE_MOCK_API is the .env default; useMockApi() honours the runtime override).
export const analyzer: Analyzer = {
  analyze(audio, card, options) {
    return (useMockApi() ? mockAnalyzer : httpAnalyzer).analyze(audio, card, options);
  },
};
