import { describe, expect, it } from 'vitest';
import { mapAnalysisResponse, decorateCard } from './mappers';
import type { BackendCard, BackendFullResponse } from '../types';

const REF = '안녕하세요';

const baseResponse = (overrides: Partial<BackendFullResponse> = {}): BackendFullResponse => ({
  phoneme_result: {
    status: { evaluation_status: 'ready' },
    llm_feedback_input: {
      reference_text: REF,
      score_breakdown: { overall: 82.4 },
      issues: [],
    },
  },
  prosody_result: [],
  pipeline_state: { prosody_executed: true, reason: 'ready' },
  ...overrides,
});

describe('mapAnalysisResponse', () => {
  it('rounds overall score and emits one phoneme cell per syllable', () => {
    const r = mapAnalysisResponse(baseResponse(), REF);
    expect(r.score).toBe(82);
    expect(r.phonemes).toHaveLength(5); // 안녕하세요 = 5 syllables
    expect(r.phonemes.every((p) => p.correct)).toBe(true);
  });

  it('marks issues correctly by syllable_idx and falls back to label', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        phoneme_result: {
          status: { evaluation_status: 'ready' },
          llm_feedback_input: {
            reference_text: REF,
            score_breakdown: { overall: 70 },
            issues: [
              { syllable_idx: 2, syllable_label: '하', target: '/ha/', user: '/a/', note: 'aspirate' },
            ],
          },
        },
      }),
      REF,
    );
    expect(r.phonemes[2].correct).toBe(false);
    expect(r.phonemes[2].user).toBe('/a/');
    expect(r.phonemes[2].target).toBe('/ha/');
    expect(r.phonemes[2].note).toBe('aspirate');
  });

  it('falls back to label-based matching when syllable_idx missing', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        phoneme_result: {
          status: { evaluation_status: 'ready' },
          llm_feedback_input: {
            reference_text: REF,
            score_breakdown: { overall: 60 },
            issues: [{ syllable_label: '녕', target: '/njʌŋ/', user: '/njə/' }],
          },
        },
      }),
      REF,
    );
    expect(r.phonemes[1].correct).toBe(false);
  });

  it('synthesizes intonation when prosody_result has slope_diff', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        prosody_result: [
          { syllable_idx: 0, syllable_label: '안', native_start: 0, learner_start: 0, rmse: 0.3, pearson: 0.8, slope_diff: 0, duration_ratio: 1 },
          { syllable_idx: 1, syllable_label: '녕', native_start: 0.2, learner_start: 0.2, rmse: 0.3, pearson: 0.8, slope_diff: -0.2, duration_ratio: 1 },
        ],
      }),
      REF,
    );
    expect(r.intonation).toHaveLength(2);
    expect(r.intonation[0].native).toBeGreaterThan(0);
    // Negative slope_diff makes mine lower than native
    expect(r.intonation[1].mine).toBeLessThan(r.intonation[1].native);
  });

  it('emits intonation warning keys based on prosody trend', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        prosody_result: [
          { syllable_idx: 0, syllable_label: '안', native_start: 0, learner_start: 0, rmse: 0.3, pearson: 0.8, slope_diff: -0.2, duration_ratio: 1 },
        ],
      }),
      REF,
    );
    expect(r.intonationWarning).toBe('intonation.endRiseLow');
  });

  it('preserves status and prosody_executed flag', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        phoneme_result: {
          status: { evaluation_status: 'retry', status_message: 'low' },
          llm_feedback_input: { reference_text: REF, issues: [] },
        },
        pipeline_state: { prosody_executed: false, reason: 'retry' },
      }),
      REF,
    );
    expect(r.status).toBe('retry');
    expect(r.statusMessage).toBe('low');
    expect(r.prosodyExecuted).toBe(false);
  });

  it('uses passed reference_text when backend omits it', () => {
    const r = mapAnalysisResponse(
      {
        phoneme_result: {
          status: { evaluation_status: 'ready' },
          llm_feedback_input: { score_breakdown: { overall: 90 } },
        },
        prosody_result: [],
        pipeline_state: { prosody_executed: false, reason: 'ready' },
      },
      '버스',
    );
    expect(r.phonemes.map((p) => p.ko)).toEqual(['버', '스']);
  });
});

describe('decorateCard', () => {
  const sample: BackendCard = {
    id: 'life_01',
    type: '생활문장',
    korean: '버스 어디서 타요?',
    russian: 'Где сесть на автобус?',
    prompt_question: '...',
    phoneme_focus: 'ㅂ/ㅃ 쌍자음',
  };

  it('derives a keyword-based emoji', () => {
    expect(decorateCard(sample).emoji).toBe('🚌');
  });

  it('falls back to type emoji when no keyword match', () => {
    const c = decorateCard({ ...sample, korean: '괜찮아요' });
    expect(c.emoji).toBe('👌'); // matches 괜찮 keyword
  });

  it('marks easy/medium/hard correctly', () => {
    expect(decorateCard({ ...sample, korean: '버스', phoneme_focus: undefined }).difficulty).toBe('easy');
    expect(decorateCard({ ...sample, korean: '어디가 아프세요?', phoneme_focus: '쌍자음' }).difficulty).toBe('hard');
  });
});
