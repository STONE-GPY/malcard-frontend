import type { Page, Route } from '@playwright/test';

export const MOCK_CARDS = [
  {
    id: 'life_01',
    type: '일상문장',
    korean: '안녕하세요',
    russian: 'Здравствуйте',
    prompt_question: '정중한 인사 표현입니다.',
    phoneme_focus: '받침',
  },
  {
    id: 'life_02',
    type: '일상문장',
    korean: '감사합니다',
    russian: 'Спасибо',
    prompt_question: '감사 인사 표현입니다.',
  },
  {
    id: 'sit_01',
    type: '상황별',
    korean: '어디가 아프세요?',
    russian: 'Где у вас болит?',
    prompt_question: '병원에서 환자에게 묻는 말이에요.',
    phoneme_focus: '격음',
  },
];

export interface FullAnalysisResponse {
  phoneme_result: {
    status: { evaluation_status: 'ready' | 'retry' | 'discarded'; status_message?: string };
    llm_feedback_input?: {
      reference_text?: string;
      score_breakdown?: {
        overall: number;
        consonant?: number;
        vowel?: number;
        coda?: number;
        fluency_like?: number;
      };
      issues?: Array<{
        syllable_idx?: number;
        syllable_label?: string;
        target?: string;
        user?: string;
        note?: string;
      }>;
      feedback?: string;
    };
    prosody_input?: unknown;
  };
  prosody_result: Array<{
    syllable_idx: number;
    syllable_label: string;
    native_start: number;
    learner_start: number;
    rmse: number;
    pearson: number;
    slope_diff: number;
    duration_ratio: number;
  }>;
  pipeline_state: { prosody_executed: boolean; reason: string };
}

export const READY_RESPONSE: FullAnalysisResponse = {
  phoneme_result: {
    status: { evaluation_status: 'ready', status_message: 'ok' },
    llm_feedback_input: {
      reference_text: '어디가 아프세요?',
      score_breakdown: {
        overall: 84,
        consonant: 80,
        vowel: 88,
        coda: 75,
        fluency_like: 24.3,
      },
      issues: [
        {
          syllable_idx: 4,
          syllable_label: '프',
          target: '/pʰɯ/',
          user: '/pu/',
          note: '격음 ㅍ로, 모음은 ㅡ로',
        },
      ],
    },
  },
  prosody_result: [
    { syllable_idx: 0, syllable_label: '어', native_start: 0.01, learner_start: 0.03, rmse: 0.42, pearson: 0.76, slope_diff: -0.05, duration_ratio: 1.02 },
    { syllable_idx: 1, syllable_label: '디', native_start: 0.18, learner_start: 0.20, rmse: 0.38, pearson: 0.80, slope_diff: -0.02, duration_ratio: 1.00 },
    { syllable_idx: 2, syllable_label: '가', native_start: 0.36, learner_start: 0.39, rmse: 0.41, pearson: 0.74, slope_diff: 0.01, duration_ratio: 1.04 },
    { syllable_idx: 3, syllable_label: '아', native_start: 0.54, learner_start: 0.58, rmse: 0.45, pearson: 0.70, slope_diff: -0.03, duration_ratio: 1.06 },
    { syllable_idx: 4, syllable_label: '프', native_start: 0.72, learner_start: 0.78, rmse: 0.65, pearson: 0.55, slope_diff: -0.20, duration_ratio: 1.18 },
    { syllable_idx: 5, syllable_label: '세', native_start: 0.92, learner_start: 0.99, rmse: 0.42, pearson: 0.72, slope_diff: -0.10, duration_ratio: 1.05 },
    { syllable_idx: 6, syllable_label: '요', native_start: 1.10, learner_start: 1.18, rmse: 0.50, pearson: 0.62, slope_diff: -0.18, duration_ratio: 1.10 },
  ],
  pipeline_state: { prosody_executed: true, reason: 'ready' },
};

export const RETRY_RESPONSE: FullAnalysisResponse = {
  phoneme_result: {
    status: { evaluation_status: 'retry', status_message: 'low confidence' },
    llm_feedback_input: { reference_text: '어디가 아프세요?', issues: [] },
  },
  prosody_result: [],
  pipeline_state: { prosody_executed: false, reason: 'retry' },
};

export const DISCARDED_RESPONSE: FullAnalysisResponse = {
  phoneme_result: {
    status: { evaluation_status: 'discarded', status_message: 'too noisy' },
    llm_feedback_input: { reference_text: '어디가 아프세요?', issues: [] },
  },
  prosody_result: [],
  pipeline_state: { prosody_executed: false, reason: 'discarded' },
};

export async function mockBackend(
  page: Page,
  opts: {
    cards?: typeof MOCK_CARDS;
    analysis?: FullAnalysisResponse;
    analysisError?: { status: number; code: string; message: string };
  } = {},
) {
  const cards = opts.cards ?? MOCK_CARDS;
  const analysis = opts.analysis ?? READY_RESPONSE;

  await page.route('**/api.test/cards**', async (route: Route) => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get('type');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const filtered = type ? cards.filter((c) => c.type === type) : cards;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
      }),
    });
  });

  await page.route('**/api.test/cards/*', async (route: Route) => {
    const id = route.request().url().split('/').pop()?.split('?')[0];
    const found = cards.find((c) => c.id === id);
    if (!found) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'CARD_NOT_FOUND', message: 'no such card' },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(found),
    });
  });

  await page.route('**/api.test/analysis/full', async (route: Route) => {
    if (opts.analysisError) {
      await route.fulfill({
        status: opts.analysisError.status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: opts.analysisError.code,
            message: opts.analysisError.message,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(analysis),
    });
  });
}

export async function clickCardByText(page: Page, koText: string) {
  await page.locator('[data-testid="card-row"]').filter({ hasText: koText }).first().click();
}
