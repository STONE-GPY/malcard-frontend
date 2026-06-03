// Mock scenarios for the analysis pipeline. Used by mockAnalyzer to simulate
// every UI state without hitting the real backend (Google TTS, wav2vec2, etc.).
// The active scenario is persisted in localStorage so dev-panel changes survive
// page reloads. A scenario either returns a BackendFullResponse, throws an
// ApiError, or sleeps before doing either.

import { ApiError } from '../api/client';
import type {
  BackendFullResponse,
  BackendIssue,
  BackendProsodyResult,
  Card,
  EvaluationStatus,
} from '../types';

export type ScenarioId =
  | 'auto'
  | 'excellent'
  | 'good'
  | 'needsWork'
  | 'retry'
  | 'discarded'
  | 'prosodySkipped'
  | 'error500'
  | 'errorNetwork'
  | 'slow';

export interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  description: string;
}

export const SCENARIOS: ScenarioMeta[] = [
  { id: 'auto', label: '🎲 랜덤 (기본)', description: '카드 ID 기반 랜덤 결과 — 항상 ready' },
  { id: 'excellent', label: '✨ 우수 (95+)', description: '모든 음소 정확, 자연스러운 억양' },
  { id: 'good', label: '👍 양호 (78)', description: '음소 2건 오류, 살짝 어색한 끝 억양' },
  { id: 'needsWork', label: '😣 보완 필요 (45)', description: '여러 음소 오류, 끊긴 억양' },
  { id: 'retry', label: '🔁 다시 녹음 (retry)', description: '오디오가 짧거나 너무 조용함' },
  { id: 'discarded', label: '⛔ 분석 불가 (discarded)', description: 'forced alignment 실패' },
  { id: 'prosodySkipped', label: '🔇 prosody 생략', description: 'phoneme 통과, 억양 분석 스킵' },
  { id: 'error500', label: '💥 500 PIPELINE_ERROR', description: '백엔드 파이프라인 예외' },
  { id: 'errorNetwork', label: '🌐 NETWORK_ERROR', description: 'fetch 실패 (서버 다운/CORS)' },
  { id: 'slow', label: '🐢 느린 응답 (8초)', description: '8초 후 우수 결과 반환' },
];

const SCENARIO_KEY = 'mc-dev-mock-scenario';
const DEFAULT_SCENARIO: ScenarioId = 'auto';

export function getActiveScenario(): ScenarioId {
  try {
    const v = localStorage.getItem(SCENARIO_KEY) as ScenarioId | null;
    if (v && SCENARIOS.some((s) => s.id === v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_SCENARIO;
}

export function setActiveScenario(id: ScenarioId) {
  try {
    localStorage.setItem(SCENARIO_KEY, id);
  } catch {
    /* ignore */
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function syllablesOf(text: string): string[] {
  return text.replace(/[\s?!.,]/g, '').split('').filter((c) => c.length > 0);
}

function makePhonemeIssues(
  syls: string[],
  badIdxs: readonly number[],
  notePool: readonly string[],
): BackendIssue[] {
  // Mock issues mirror the real backend shape: include both the legacy
  // syllable_idx mapping AND the IPA-level description/tip the new UI uses.
  const ipaPairs = [
    { ref: 'ʌ', hyp: 'o', type: 'vowel_confusion' },
    { ref: 'ɛ', hyp: 'e', type: 'vowel_confusion' },
    { ref: 'l', hyp: 'r', type: 'liquid_confusion' },
    { ref: 'ŋ', hyp: 'n', type: 'coda_confusion' },
  ];
  return badIdxs.map((idx, i) => {
    const pair = ipaPairs[i % ipaPairs.length];
    return {
      syllable_idx: idx,
      syllable_label: syls[idx] ?? '?',
      target: pair.ref,
      user: pair.hyp,
      note: notePool[i % notePool.length],
      issue_type: pair.type,
      severity: i === 0 ? 'medium' : 'low',
      description: `${pair.hyp} 대신 ${pair.ref}로 들렸어요.`,
      tip: notePool[i % notePool.length],
      ref_token: pair.ref,
      hyp_token: pair.hyp,
      cost: 0.4,
      acceptable: false,
    };
  });
}

// Synthesize a lens-rule v3 prosody_result (path-step z-score curves + eojeol
// boundaries + optional records) so the dev panel exercises the new F0 chart.
// `slopeBias` biases the learner curve; a large bias yields a pitch record.
function makeProsody(
  syls: string[],
  options: { slopeBias?: number; pearsonBase?: number; rmseBase?: number } = {},
): BackendProsodyResult {
  const round = (v: number) => Math.round(v * 100) / 100;
  const slopeBias = options.slopeBias ?? 0;
  const n = Math.max(40, syls.length * 12);

  const native: number[] = [];
  const learner: number[] = [];
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const base = 1.0 - 1.8 * x + 0.35 * Math.sin(x * Math.PI * Math.max(2, syls.length));
    native.push(round(base));
    learner.push(round(base + slopeBias * 6 * x + 0.12 * Math.sin(x * Math.PI * 7)));
    times.push(round(i * 0.01));
  }

  const eojeol_boundaries = syls.map((c, i) => ({
    path_step: Math.round((i / syls.length) * n),
    label: c as string | null,
  }));
  eojeol_boundaries.push({ path_step: n - 1, label: null });

  const records: NonNullable<BackendProsodyResult['records']> = [];
  if (Math.abs(slopeBias) >= 0.1 && syls.length > 0) {
    const idx = syls.length - 1;
    records.push({
      eojeol_idx: idx,
      rule_label: slopeBias > 0 ? 'pitch_rising_excess' : 'pitch_falling_excess',
      severity: Math.abs(slopeBias) >= 0.15 ? 'major' : 'minor',
      feedback_text:
        slopeBias > 0
          ? `'${syls[idx]}' 어절의 후반에서 음이 올라갔어요. 더 평평하게 말해봐요.`
          : `'${syls[idx]}' 어절의 후반에서 음이 떨어졌어요. 더 평평하게 말해봐요.`,
      evidence_metrics: { eojeol_label: syls[idx] },
    });
  }

  return {
    reference_text: syls.join(''),
    records,
    summary_when_no_outlier: records.length === 0 ? '잘 발화했어요!' : null,
    prosody_plot: {
      native_f0_zscore: native,
      learner_f0_zscore: learner,
      learner_time_at_step: times,
      eojeol_boundaries,
    },
  };
}

function readyResponse(opts: {
  reference: string;
  status: EvaluationStatus;
  overall: number;
  issues: BackendIssue[];
  prosody: BackendProsodyResult;
  prosodyExecuted: boolean;
  reason: string;
}): BackendFullResponse {
  return {
    phoneme_result: {
      status: { evaluation_status: opts.status, status_message: 'mock ok' },
      llm_feedback_input: {
        reference_text: opts.reference,
        score_breakdown: {
          overall: opts.overall,
          consonant: Math.max(0, opts.overall - 4),
          vowel: Math.min(100, opts.overall + 3),
          coda: Math.max(0, opts.overall - 8),
          fluency_like: opts.overall * 0.32,
        },
        issues: opts.issues,
      },
    },
    prosody_result: opts.prosody,
    pipeline_state: { prosody_executed: opts.prosodyExecuted, reason: opts.reason },
  };
}

// ── scenario implementations ─────────────────────────────────────────────────

export interface ScenarioContext {
  card: Card;
  // For 'auto' fallback: builder used by the legacy random mock so the panel's
  // default value behaves exactly like before.
  defaultBuilder: (card: Card) => BackendFullResponse;
}

export interface ScenarioResult {
  // Either a response payload or an error. When response is a function, the
  // analyzer awaits it (used for 'slow' to schedule a delayed return).
  response?: BackendFullResponse | Promise<BackendFullResponse>;
  throws?: Error;
}

export async function buildScenarioResponse(
  id: ScenarioId,
  ctx: ScenarioContext,
): Promise<BackendFullResponse> {
  const reference = ctx.card.korean;
  const syls = syllablesOf(reference);

  switch (id) {
    case 'auto':
      return ctx.defaultBuilder(ctx.card);

    case 'excellent':
      return readyResponse({
        reference,
        status: 'ready',
        overall: 96,
        issues: [],
        prosody: makeProsody(syls, { slopeBias: 0.02, pearsonBase: 0.95, rmseBase: 0.18 }),
        prosodyExecuted: true,
        reason: 'ready',
      });

    case 'good':
      return readyResponse({
        reference,
        status: 'ready',
        overall: 78,
        issues: makePhonemeIssues(syls, [Math.min(1, syls.length - 1), Math.max(0, syls.length - 2)], [
          '받침을 더 또렷하게',
          '모음을 길게 내보세요',
        ]),
        prosody: makeProsody(syls, { slopeBias: -0.07, pearsonBase: 0.7, rmseBase: 0.35 }),
        prosodyExecuted: true,
        reason: 'ready',
      });

    case 'needsWork':
      return readyResponse({
        reference,
        status: 'ready',
        overall: 45,
        issues: makePhonemeIssues(
          syls,
          syls.map((_, i) => i).filter((i) => i % 2 === 0),
          ['발음을 천천히', 'ㅓ/ㅗ 모음 구분', '쌍자음을 단단하게', '받침을 분명히'],
        ),
        prosody: makeProsody(syls, { slopeBias: 0.15, pearsonBase: 0.3, rmseBase: 0.65 }),
        prosodyExecuted: true,
        reason: 'ready',
      });

    case 'retry':
      return {
        phoneme_result: {
          status: {
            evaluation_status: 'retry',
            status_message: '오디오가 너무 짧거나 조용해요',
          },
        },
        prosody_result: {},
        pipeline_state: { prosody_executed: false, reason: 'retry' },
      };

    case 'discarded':
      return {
        phoneme_result: {
          status: {
            evaluation_status: 'discarded',
            status_message: '강제 정렬 신뢰도가 낮아 평가에 사용할 수 없어요',
          },
        },
        prosody_result: {},
        pipeline_state: { prosody_executed: false, reason: 'discarded' },
      };

    case 'prosodySkipped':
      return readyResponse({
        reference,
        status: 'ready',
        overall: 84,
        issues: makePhonemeIssues(syls, [Math.max(0, syls.length - 2)], ['연음 처리에 주의']),
        prosody: {},
        prosodyExecuted: false,
        reason: 'tts_unavailable',
      });

    case 'error500':
      throw new ApiError('PIPELINE_ERROR', 'PraatError: Not an audio file.', 500);

    case 'errorNetwork':
      throw new ApiError('NETWORK_ERROR', 'Failed to fetch', 0);

    case 'slow':
      await new Promise((resolve) => setTimeout(resolve, 8000));
      return readyResponse({
        reference,
        status: 'ready',
        overall: 91,
        issues: [],
        prosody: makeProsody(syls, { slopeBias: 0.0, pearsonBase: 0.92, rmseBase: 0.22 }),
        prosodyExecuted: true,
        reason: 'ready',
      });
  }
}
