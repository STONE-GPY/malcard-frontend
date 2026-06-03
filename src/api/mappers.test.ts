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
  prosody_result: {},
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

  it('maps prosody_plot into a path-step F0 chart model', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        prosody_result: {
          reference_text: REF,
          records: [],
          summary_when_no_outlier: '잘 발화했어요!',
          prosody_plot: {
            native_f0_zscore: [0.2, 0.0, -0.1, -0.3],
            learner_f0_zscore: [0.3, 0.1, -0.2, -0.4],
            learner_time_at_step: [0, 0.01, 0.02, 0.03],
            eojeol_boundaries: [
              { path_step: 0, label: '안녕' },
              { path_step: 2, label: '하세요' },
              { path_step: 3, label: null },
            ],
          },
        },
      }),
      REF,
    );
    expect(r.prosody).toBeDefined();
    expect(r.prosody!.points).toHaveLength(4);
    expect(r.prosody!.points[0]).toMatchObject({ step: 0, t: 0, native: 0.2, mine: 0.3 });
    expect(r.prosody!.maxStep).toBe(3);
    // sentinel boundary (label === null) is excluded
    expect(r.prosody!.boundaries).toEqual([
      { step: 0, label: '안녕' },
      { step: 2, label: '하세요' },
    ]);
    expect(r.prosody!.records).toHaveLength(0);
    expect(r.prosody!.summary).toBe('잘 발화했어요!');
  });

  it('derives problem zones from records using eojeol boundaries', () => {
    const r = mapAnalysisResponse(
      baseResponse({
        prosody_result: {
          records: [
            { eojeol_idx: 1, rule_label: 'pitch_rising_excess', severity: 'major', feedback_text: 'x' },
          ],
          prosody_plot: {
            native_f0_zscore: [0, 0, 0, 0],
            learner_f0_zscore: [0, 0, 0, 0],
            learner_time_at_step: [0, 1, 2, 3],
            eojeol_boundaries: [
              { path_step: 0, label: '오늘' },
              { path_step: 2, label: '좋네요' },
              { path_step: 3, label: null },
            ],
          },
        },
      }),
      REF,
    );
    // eojeol_idx 1 spans boundary[1].path_step → boundary[2].path_step
    expect(r.prosody!.zones).toEqual([
      { from: 2, to: 3, rule: 'pitch_rising_excess', severity: 'major' },
    ]);
  });

  it('returns undefined prosody when prosody_plot is absent', () => {
    const r = mapAnalysisResponse(baseResponse({ prosody_result: {} }), REF);
    expect(r.prosody).toBeUndefined();
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
        prosody_result: {},
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
