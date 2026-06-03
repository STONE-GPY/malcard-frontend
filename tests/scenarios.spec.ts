// Comprehensive user-scenario coverage on top of tests/e2e.spec.ts.
//
// The existing spec proves the legacy card flow + the three analysis statuses
// (ready/retry/discarded) + one situation pipeline test. This file fills the
// gaps with focused scenarios across every reachable screen, and tops it off
// with a single end-to-end happy path through the *PR3-specific* 4-step
// situation pipeline (home → step1 → step2 puzzle → step3 speech → result →
// back home → BottomNav into history).

import { test, expect, type Page } from '@playwright/test';
import {
  clickCardByText,
  mockBackend,
  mockSpeechRecognition,
  READY_RESPONSE,
  seedAutoplayFalse,
  type FullAnalysisResponse,
} from './fixtures';

function withOverall(base: FullAnalysisResponse, overall: number): FullAnalysisResponse {
  const clone = JSON.parse(JSON.stringify(base)) as FullAnalysisResponse;
  if (clone.phoneme_result.llm_feedback_input?.score_breakdown) {
    clone.phoneme_result.llm_feedback_input.score_breakdown.overall = overall;
  }
  return clone;
}

async function practiceLegacyCard(page: Page, koTitle: string) {
  await page.goto('/');
  await clickCardByText(page, koTitle);
  await page.getByRole('button', { name: '녹음 시작' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '정지' }).click();
  await page.waitForURL(/\/result$/, { timeout: 10_000 });
}

// Reusable solver for a single puzzle on /situations/:id/step2: click each
// answer word in order, press check, wait for the navigation to step3.
async function solvePuzzle(page: Page, answer: string[]) {
  for (const word of answer) {
    await page.locator(`[data-testid="situation-word"][data-word="${word}"]`).click();
  }
  await page.locator('[data-testid="situation-check-puzzle"]').click();
  await expect(page).toHaveURL(/\/step3$/, { timeout: 5_000 });
}

// Reusable speech-check pass for /situations/:id/step3 — fires the mocked
// SpeechRecognition, verifies success, and clicks Next to advance.
async function passSpeechCheck(page: Page) {
  await page.locator('[data-testid="situation-mic"]').click();
  await expect(page.locator('[data-testid="situation-check-speech"]')).toBeVisible();
  await page.locator('[data-testid="situation-check-speech"]').click();
  await expect(page.locator('[data-testid="situation-speech-success"]')).toBeVisible();
  await page.locator('[data-testid="situation-next"]').click();
}

test.describe('MalCard scenarios — additional flows (PR3)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAutoplayFalse(page);
  });

  // ───────────────────────── Card selection ─────────────────────────

  test('Situations category swaps card-rows for situation-cards', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    // Phoneme practice cards come from local static data (backend /cards serves
    // situations now), so the home list renders the full local set.
    await expect(page.locator('[data-testid="card-row"]').first()).toBeVisible();
    await page.locator('[data-testid="mode-situation"]').click();
    await expect(page.locator('[data-testid="card-row"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="situation-card"]').first()).toBeVisible();
  });

  test('Deck chip toggling filters and clears the situation list', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('[data-testid="mode-situation"]').click();
    // Wait for the first situation card before counting; the dataset is
    // dynamically imported and the count would otherwise sample [] on first
    // render.
    await expect(page.locator('[data-testid="situation-card"]').first()).toBeVisible();
    const situationsBefore = await page.locator('[data-testid="situation-card"]').count();
    expect(situationsBefore).toBeGreaterThan(0);

    const shoppingDeck = page.locator('[data-testid="deck-shopping"]');
    await expect(shoppingDeck).toHaveAttribute('aria-pressed', 'false');
    await shoppingDeck.click();
    await expect(shoppingDeck).toHaveAttribute('aria-pressed', 'true');
    // Shopping keywords filter the situation set; the count should be smaller.
    const filteredCount = await page.locator('[data-testid="situation-card"]').count();
    expect(filteredCount).toBeLessThan(situationsBefore);

    // Toggling off restores the full list.
    await shoppingDeck.click();
    await expect(shoppingDeck).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-testid="situation-card"]')).toHaveCount(situationsBefore);
  });

  test('Switching back from situations to pronunciation restores card-rows', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('[data-testid="mode-situation"]').click();
    await expect(page.locator('[data-testid="situation-card"]').first()).toBeVisible();
    // Category chips are hidden in situation mode; switch back via the mode
    // toggle, which restores the last pronunciation category (card-rows).
    await page.locator('[data-testid="mode-pronunciation"]').click();
    await expect(page.locator('[data-testid="situation-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="card-row"]').first()).toBeVisible();
    // Category chips are available again in pronunciation mode.
    await page.locator('[data-testid="category-daily"]').click();
    await expect(page.locator('[data-testid="card-row"]').first()).toBeVisible();
  });

  // ───────────────────────── Card learn ─────────────────────────

  test('Learn page redirects to home when no card has been selected', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/learn');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Back button on learn page returns to the home picker', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await clickCardByText(page, '어디서 내려요?');
    await expect(page).toHaveURL(/\/learn$/);
    await page.locator('[data-testid="learn-page"]').getByRole('button', { name: '닫기' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  // ───────────────────────── Loading ─────────────────────────

  test('Loading page redirects to home when there is no audio blob', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/loading');
    await expect(page).toHaveURL(/\/$/);
  });

  // ───────────────────────── Result ─────────────────────────

  test('Ready result: "다시 녹음" returns to the learn page', async ({ page }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });
    await practiceLegacyCard(page, '병원 접수 어떻게 해요?');
    await expect(page.locator('[data-testid="score-card"]')).toBeVisible();
    await page.getByRole('button', { name: /다시 녹음/ }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test('Ready result: "다음 카드" advances to the next learn page', async ({ page }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });
    await practiceLegacyCard(page, '어디서 내려요?');
    // PR3 wires the next-card CTA to `nextCard()` + navigate('/learn'), not
    // back to the home picker (which is the main-branch behaviour).
    await page.getByRole('button', { name: /다음 카드/ }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test('AI coaching bubble is present on a ready result', async ({ page }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });
    await practiceLegacyCard(page, '병원 접수 어떻게 해요?');
    await expect(page.locator('[data-testid="ai-bubble"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-bubble"]')).toContainText('MalCard AI');
  });

  // ───────────────────────── Daily complete ─────────────────────────

  test('Daily complete redirects home when the goal has not been achieved', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/daily-complete');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Hitting a cardCount=1 goal auto-navigates from /result to /daily-complete', async ({
    page,
  }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });

    await page.goto('/profile');
    await page.getByText('일일 학습 목표').click();
    await page.locator('[data-testid="goal-type-cardCount"]').click();
    const slider = page.locator('[data-testid="goal-target"]');
    await slider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, '1');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('[data-testid="goal-save"]').click();
    await expect(page.getByText(/카드 1장/)).toBeVisible();

    // PR3 wires the daily-complete handoff via a useEffect on ResultPage —
    // landing on /result with progress.achieved triggers an automatic
    // navigation, no user click required.
    await page.goto('/');
    await clickCardByText(page, '어디서 내려요?');
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '정지' }).click();
    await page.waitForURL(/\/daily-complete$/, { timeout: 10_000 });

    await page.locator('[data-testid="daily-back-home"]').click();
    await expect(page).toHaveURL(/\/$/);
  });

  // ───────────────────────── History ─────────────────────────

  test('History "best" filter hides sub-90 attempts via the empty-filter state', async ({
    page,
  }) => {
    await mockBackend(page, { analysis: withOverall(READY_RESPONSE, 84) });
    await practiceLegacyCard(page, '병원 접수 어떻게 해요?');
    await expect(page.locator('[data-testid="score-card"]')).toBeVisible();
    await page.waitForTimeout(200);
    await page.goto('/history');
    await page.locator('[data-testid="filter-best"]').click();
    await expect(page.locator('[data-testid="history-empty-filter"]')).toBeVisible();
  });

  test('History "review" filter surfaces low-score attempts', async ({ page }) => {
    await mockBackend(page, { analysis: withOverall(READY_RESPONSE, 55) });
    await practiceLegacyCard(page, '병원 접수 어떻게 해요?');
    await expect(page.locator('[data-testid="score-card"]')).toBeVisible();
    await page.waitForTimeout(200);
    await page.goto('/history');
    await page.locator('[data-testid="filter-review"]').click();
    await expect(page.locator('[data-testid="history-session"]').first()).toBeVisible();
  });

  test('Clicking a history session jumps into the learn page for that card', async ({ page }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });
    await practiceLegacyCard(page, '병원 접수 어떻게 해요?');
    await expect(page.locator('[data-testid="score-card"]')).toBeVisible();
    await page.waitForTimeout(200);
    await page.goto('/history');
    await page.locator('[data-testid="history-session"]').first().click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  // ───────────────────────── Profile ─────────────────────────

  test('Help modal opens then closes via the 닫기 button', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/profile');
    await page.getByText('도움말 · 자주 묻는 질문').click();
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();
    await page.locator('[data-testid="modal"]').getByRole('button', { name: '닫기' }).click();
    await expect(page.locator('[data-testid="modal"]')).toHaveCount(0);
  });

  test('About modal renders the current app version line', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/profile');
    await page.getByText('MalCard 정보').click();
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal"]')).toContainText(/버전/);
  });

  test('Goal modal cancel keeps the original goal label intact', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/profile');
    await expect(page.getByText(/카드 5장/)).toBeVisible();
    await page.getByText('일일 학습 목표').click();
    await page.locator('[data-testid="goal-type-avgScore"]').click();
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.locator('[data-testid="modal"]')).toHaveCount(0);
    await expect(page.getByText(/카드 5장/)).toBeVisible();
  });

  test('Language switch to English persists across a full reload', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/profile');
    await page.getByText('앱 언어').click();
    await page.locator('[data-testid="lang-en"]').click();
    await expect(page.getByText('Settings')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  // ───────────────────────── Navigation ─────────────────────────

  test('BottomNav cycles through Home / History / Profile routes', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('button', { name: '기록', exact: true }).click();
    await expect(page).toHaveURL(/\/history$/);
    await page.getByRole('button', { name: '프로필', exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByRole('button', { name: '홈', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  // ───────────── End-to-end PR3 happy path ─────────────
  //
  // The headline PR3 contribution is the situation pipeline: every situation
  // card walks the learner through Step1 (dialogue scene) → Step2 (puzzle for
  // N target sentences) → Step3 (speech check for each) → result. This test
  // drives the full pipeline for unit1_01 (보건실, 3 puzzles) without skipping
  // any screen, then closes the loop by returning home and tapping the
  // BottomNav to verify global navigation still works.

  test('PR3 end-to-end: home → situation pipeline (step1→2→3 × 3 puzzles) → result → home', async ({
    page,
  }) => {
    await mockBackend(page);
    await mockSpeechRecognition(page);

    // 1. Start screen — header, hello banner, phoneme cards (local static data).
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MalCard' })).toBeVisible();
    await expect(page.locator('[data-testid="card-row"]').first()).toBeVisible();

    // 2. Switch into the situations category and confirm unit1_01 is in view.
    await page.locator('[data-testid="mode-situation"]').click();
    await expect(page.locator('[data-situation-id="unit1_01"]')).toBeVisible();

    // 3. Open the situation, land on Step 1 (dialogue) and proceed.
    await page.locator('[data-situation-id="unit1_01"]').click();
    await expect(page).toHaveURL(/\/situations\/unit1_01\/step1$/);
    await page.locator('[data-testid="situation-start"]').click();
    await expect(page).toHaveURL(/\/situations\/unit1_01\/step2$/);

    // 4. Three sentences in unit1_01. Solve the puzzle and speech check for
    //    each one in order. The data lives in src/data/cards.json — keeping
    //    the answers inline makes the journey self-contained.
    const answers: string[][] = [
      ['나는', '지난주에', '배가', '아팠어요.'],
      ['무릎이', '아파서', '걷기가', '힘들어요.'],
      ['손에', '상처가', '나서', '소독을', '했어요.'],
    ];

    for (let i = 0; i < answers.length; i++) {
      await solvePuzzle(page, answers[i]);
      await passSpeechCheck(page);
      if (i < answers.length - 1) {
        await expect(page).toHaveURL(/\/step2$/, { timeout: 5_000 });
      }
    }

    // 5. Result screen renders the completion artwork + summary copy.
    await expect(page).toHaveURL(/\/situations\/unit1_01\/result$/, { timeout: 5_000 });
    await expect(page.locator('[data-testid="situation-result"]')).toBeVisible();

    // 6. "다른 상황 보기" returns to the home picker without breaking nav.
    await page.locator('[data-testid="situation-result"]').getByRole('button').click();
    await expect(page).toHaveURL(/\/$/);

    // 7. BottomNav still works — confirm we can hop into History/Profile.
    await page.getByRole('button', { name: '기록', exact: true }).click();
    await expect(page).toHaveURL(/\/history$/);
    await page.getByRole('button', { name: '프로필', exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  // ───────────── 기획서 보완 기능 (TTS · 듣기 · 레벨 필터) ─────────────

  test('Step1 dialogue exposes per-line listen buttons and a difficulty badge', async ({
    page,
  }) => {
    await mockBackend(page);
    // Situations come from the local cards.json bundle, so direct nav works.
    await page.goto('/situations/unit1_01/step1');
    await expect(page.locator('[data-testid="situation-difficulty-badge"]')).toBeVisible();
    const listens = page.locator('[data-testid="situation-dialogue-listen"]');
    await expect(listens.first()).toBeVisible();
    expect(await listens.count()).toBeGreaterThanOrEqual(1);
    // Tapping a bubble plays its line (TTS) and must not throw.
    await listens.first().click();
  });

  test('Step2 shows the success banner on a correct puzzle before advancing', async ({ page }) => {
    await mockBackend(page);
    await mockSpeechRecognition(page);
    await page.goto('/situations/unit1_01/step1');
    await page.locator('[data-testid="situation-start"]').click();
    await expect(page).toHaveURL(/\/step2$/);
    // Solve the first puzzle in order.
    for (const word of ['나는', '지난주에', '배가', '아팠어요.']) {
      await page.locator(`[data-testid="situation-word"][data-word="${word}"]`).click();
    }
    await page.locator('[data-testid="situation-check-puzzle"]').click();
    // 기획서 3-2: 정답 시 성공 피드백 표시 후 정답 문장 음성 재생 → STEP3 진입.
    await expect(page.locator('[data-testid="situation-puzzle-success"]')).toBeVisible();
    await expect(page).toHaveURL(/\/step3$/, { timeout: 5_000 });
  });

  test('Step3 exposes a reference "listen" button that plays without error', async ({ page }) => {
    await mockBackend(page);
    await mockSpeechRecognition(page);
    await page.goto('/situations/unit1_01/step1');
    await page.locator('[data-testid="situation-start"]').click();
    for (const word of ['나는', '지난주에', '배가', '아팠어요.']) {
      await page.locator(`[data-testid="situation-word"][data-word="${word}"]`).click();
    }
    await page.locator('[data-testid="situation-check-puzzle"]').click();
    await expect(page).toHaveURL(/\/step3$/, { timeout: 5_000 });
    const listen = page.locator('[data-testid="situation-listen"]');
    await expect(listen).toBeVisible();
    await listen.click(); // reference playback must not throw
  });

  test('Difficulty filter narrows the situation list and toggles back', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.locator('[data-testid="mode-situation"]').click();
    await expect(page.locator('[data-testid="situation-card"]').first()).toBeVisible();
    const total = await page.locator('[data-testid="situation-card"]').count();
    await expect(page.locator('[data-testid="difficulty-filter"]')).toBeVisible();

    const easy = page.locator('[data-testid="difficulty-easy"]');
    await expect(easy).toHaveAttribute('aria-pressed', 'false');
    await easy.click();
    await expect(easy).toHaveAttribute('aria-pressed', 'true');
    const easyCount = await page.locator('[data-testid="situation-card"]').count();
    expect(easyCount).toBeGreaterThan(0);
    expect(easyCount).toBeLessThan(total);

    // Toggling the active difficulty off restores the full list.
    await easy.click();
    await expect(easy).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-testid="situation-card"]')).toHaveCount(total);
  });
});
