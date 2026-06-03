import type { Page, Route } from '@playwright/test';

export const MOCK_CARDS = [
  {
    id: 'life_01',
    type: '생활문장',
    korean: '어디서 내려요?',
    russian: 'Где выходить?',
    prompt_question: '버스나 지하철에서 자주 쓰는 말이에요. 따라 말해보세요!',
    phoneme_focus: 'ㄹ 받침',
  },
  {
    id: 'life_02',
    type: '생활문장',
    korean: '감사합니다.',
    russian: 'Спасибо.',
    prompt_question: '가장 기본적인 감사 표현이에요.',
    phoneme_focus: 'ㅂ 받침',
  },
  {
    id: 'situation_01',
    type: '상황형회화',
    korean: '병원 접수 어떻게 해요?',
    russian: 'Как записаться на приём в больницу?',
    prompt_question: '병원에 처음 갔을 때 써요.',
    phoneme_focus: '의문문 억양 상승',
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
  prosody_result: {
    reference_text?: string;
    records?: Array<{
      eojeol_idx: number;
      rule_label: string;
      severity: 'minor' | 'major';
      feedback_text: string;
      evidence_metrics?: { eojeol_label?: string };
    }>;
    summary_when_no_outlier?: string | null;
    prosody_plot?: {
      native_f0_zscore: number[];
      learner_f0_zscore: number[];
      learner_time_at_step: number[];
      eojeol_boundaries: Array<{ path_step: number; label: string | null }>;
    };
  };
  pipeline_state: { prosody_executed: boolean; reason: string };
}

export const READY_RESPONSE: FullAnalysisResponse = {
  phoneme_result: {
    status: { evaluation_status: 'ready', status_message: 'ok' },
    llm_feedback_input: {
      reference_text: '병원 접수 어떻게 해요?',
      score_breakdown: {
        overall: 84,
        consonant: 80,
        vowel: 88,
        coda: 75,
        fluency_like: 24.3,
      },
      issues: [
        {
          syllable_idx: 6,
          syllable_label: '게',
          target: '/ke/',
          user: '/kɛ/',
          note: '모음 ㅔ를 더 분명하게',
        },
      ],
    },
  },
  prosody_result: {
    reference_text: '병원 접수 어떻게 해요?',
    records: [
      {
        eojeol_idx: 1,
        rule_label: 'pitch_offset',
        severity: 'minor',
        feedback_text: "'접수' 어절 전체 음높이가 조금 높아요. 조금만 낮게 말해봐요.",
        evidence_metrics: { eojeol_label: '접수' },
      },
    ],
    summary_when_no_outlier: null,
    prosody_plot: {
      native_f0_zscore: [1.2, 1.0, 0.8, 0.5, 0.3, 0.1, -0.1, -0.3, -0.5, -0.7, -0.9, -1.1],
      learner_f0_zscore: [1.1, 1.0, 0.9, 0.8, 0.7, 0.5, 0.2, 0.0, -0.2, -0.5, -0.8, -1.0],
      learner_time_at_step: [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.96, 1.08, 1.2, 1.32],
      eojeol_boundaries: [
        { path_step: 0, label: '병원' },
        { path_step: 3, label: '접수' },
        { path_step: 6, label: '어떻게' },
        { path_step: 9, label: '해요' },
        { path_step: 11, label: null },
      ],
    },
  },
  pipeline_state: { prosody_executed: true, reason: 'ready' },
};

export const RETRY_RESPONSE: FullAnalysisResponse = {
  phoneme_result: {
    status: { evaluation_status: 'retry', status_message: 'low confidence' },
    llm_feedback_input: { reference_text: '병원 접수 어떻게 해요?', issues: [] },
  },
  prosody_result: {},
  pipeline_state: { prosody_executed: false, reason: 'retry' },
};

export const DISCARDED_RESPONSE: FullAnalysisResponse = {
  phoneme_result: {
    status: { evaluation_status: 'discarded', status_message: 'too noisy' },
    llm_feedback_input: { reference_text: '병원 접수 어떻게 해요?', issues: [] },
  },
  prosody_result: {},
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

// Seed `autoplay: false` into the persisted history store before React
// hydrates. Without this, opening /learn auto-fires SpeechSynthesis and the
// "예문 듣기" button's aria-label flips to "정지", colliding with the mic-stop
// button (also "정지") under strict-mode locators. Only surfaces on hosts with
// a real TTS voice set (e.g. Windows chromium).
//
// addInitScript runs on every new document, so we guard on key presence to
// avoid wiping goal/history/language state set DURING the test on each
// subsequent goto().
export async function seedAutoplayFalse(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (!window.localStorage.getItem('malcard-history')) {
        window.localStorage.setItem(
          'malcard-history',
          JSON.stringify({
            state: {
              history: {},
              favorites: [],
              goal: { type: 'cardCount', target: 5 },
              lastSeenGoalDate: null,
              autoplay: false,
            },
            version: 2,
          }),
        );
      }
    } catch {
      /* private-mode browser; ignore */
    }
  });
}

// Stand-in for the Web Speech API used by SituationStep3Page. The real engine
// is unavailable in headless chromium. Our mock immediately calls onresult
// with the visible target sentence so the "Check pronunciation" assertion can
// succeed deterministically.
export async function mockSpeechRecognition(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = true;
      lang = 'ko-KR';
      onstart?: () => void;
      onresult?: (event: unknown) => void;
      onend?: () => void;
      onerror?: (event: unknown) => void;

      start() {
        this.onstart?.();
        const transcript = document
          .querySelector('[data-testid="situation-target-sentence"]')
          ?.textContent ?? '';
        setTimeout(() => {
          this.onresult?.({ resultIndex: 0, results: [[{ transcript }]] });
          this.onend?.();
        }, 20);
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });
  });
}
