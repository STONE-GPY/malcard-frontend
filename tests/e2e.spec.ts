import { test, expect } from '@playwright/test';
import {
  clickCardByText,
  DISCARDED_RESPONSE,
  mockBackend,
  READY_RESPONSE,
  RETRY_RESPONSE,
} from './fixtures';

test.describe('MalCard end-to-end (mocked backend)', () => {
  test('Home renders cards from /cards endpoint', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MalCard' })).toBeVisible();
    await expect(page.locator('[data-testid="card-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="card-row"]')).toHaveCount(3);
    await expect(page.getByText('어디서 내려요?')).toBeVisible();
    await expect(page.getByText('Где выходить?')).toBeVisible();
  });

  test('Category filter sends type query and updates list', async ({ page }) => {
    await mockBackend(page);

    const cardsRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/cards') && !req.url().includes('/cards/')) {
        cardsRequests.push(new URL(req.url()).search);
      }
    });

    await page.goto('/');
    await page.locator('[data-testid="category-situations"]').click();
    await expect.poll(() => cardsRequests.some((s) => s.includes('type='))).toBe(true);
    await expect(page.locator('[data-testid="card-row"]')).toHaveCount(1);
    await expect(page.getByText('병원 접수 어떻게 해요?')).toBeVisible();
  });

  test('Cards endpoint failure shows error panel with retry', async ({ page }) => {
    const cardsRoute = /\/api\.test\/cards/;
    await page.route(cardsRoute, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'boom' },
        }),
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="cards-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="cards-error"]')).toContainText('서버 오류');

    await page.unroute(cardsRoute);
    await page.route(cardsRoute, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, limit: 50, offset: 0 }),
      });
    });

    await page.getByRole('button', { name: '다시 시도' }).click();
    await expect(page.locator('[data-testid="empty-cards"]')).toBeVisible();
  });

  test('Full flow: record → loading → ready result with mapped score/phonemes/intonation', async ({ page }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });
    await page.goto('/');
    await clickCardByText(page, '병원 접수 어떻게 해요?');
    await expect(page).toHaveURL(/\/learn$/);
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await expect(page.locator('[data-testid="recording-wave"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-timer"]')).toBeVisible();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '정지' }).click();

    await expect(page).toHaveURL(/\/loading$/);
    await expect(page.getByText('음성을 분석하고 있어요')).toBeVisible();

    await page.waitForURL(/\/result$/, { timeout: 10_000 });
    await expect(page.locator('[data-testid="score-card"]')).toBeVisible();
    // overall: 84
    await expect(page.locator('[data-testid="score-card"]')).toContainText('84');
    // 8/9 correct (one issue on '게')
    await expect(page.locator('[data-testid="phoneme-section"]')).toContainText('8/9');
    // intonation panel rendered (prosody_executed=true)
    await expect(page.locator('[data-testid="intonation-section"]')).toBeVisible();
    // history mini chart and daily progress always rendered for ready
    await expect(page.locator('[data-testid="history-mini"]')).toBeVisible();
    await expect(page.locator('[data-testid="daily-progress"]')).toBeVisible();
    // wrong phoneme note surfaced
    await expect(page.locator('[data-testid="phoneme-section"]')).toContainText('모음 ㅔ');
  });

  test('retry status shows retry banner and hides intonation panel', async ({ page }) => {
    await mockBackend(page, { analysis: RETRY_RESPONSE });
    await page.goto('/');
    await clickCardByText(page, '병원 접수 어떻게 해요?');
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '정지' }).click();
    await page.waitForURL(/\/result$/, { timeout: 10_000 });

    await expect(page.locator('[data-testid="retry-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-banner"]')).toContainText('다시 녹음');
    await expect(page.locator('[data-testid="score-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="intonation-section"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="phoneme-section"]')).toHaveCount(0);
  });

  test('discarded status shows discarded banner', async ({ page }) => {
    await mockBackend(page, { analysis: DISCARDED_RESPONSE });
    await page.goto('/');
    await clickCardByText(page, '병원 접수 어떻게 해요?');
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '정지' }).click();
    await page.waitForURL(/\/result$/, { timeout: 10_000 });

    await expect(page.locator('[data-testid="discarded-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="discarded-banner"]')).toContainText('신뢰');
  });

  test('analysis API error surfaces user message via error code', async ({ page }) => {
    await mockBackend(page, {
      analysisError: { status: 400, code: 'INVALID_AUDIO', message: 'bad audio' },
    });
    await page.goto('/');
    await clickCardByText(page, '어디서 내려요?');
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '정지' }).click();
    await page.waitForURL(/\/result$/, { timeout: 10_000 });

    await expect(page.locator('[data-testid="result-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="result-error"]')).toContainText('녹음 파일을 확인');
    await expect(page.locator('[data-testid="result-error"]')).toContainText('INVALID_AUDIO');
  });

  test('FormData payload matches API spec', async ({ page }) => {
    await mockBackend(page);
    const received: { audio?: string; text?: string; profile?: string } = {};
    await page.route('**/api.test/analysis/full', async (route) => {
      const post = route.request().postData() ?? '';
      received.audio = /name="audio"/.test(post) ? 'present' : 'missing';
      const refMatch = post.match(/name="reference_text"\r?\n\r?\n([^\r\n]+)/);
      received.text = refMatch?.[1];
      const profMatch = post.match(/name="profile"\r?\n\r?\n([^\r\n]+)/);
      received.profile = profMatch?.[1];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(READY_RESPONSE),
      });
    });

    await page.goto('/');
    await clickCardByText(page, '어디서 내려요?');
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '정지' }).click();
    await page.waitForURL(/\/result$/, { timeout: 10_000 });

    expect(received.audio).toBe('present');
    expect(received.text).toBe('어디서 내려요?');
    expect(received.profile).toBe('ru');
  });

  test('Language picker switches UI text', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/profile');
    // Open language modal
    await page.getByText('앱 언어').click();
    await page.locator('[data-testid="lang-en"]').click();
    // Modal closed and Profile labels are now English
    await expect(page.getByText('Settings')).toBeVisible();
    await expect(page.getByText('App language')).toBeVisible();
  });

  test('Daily goal modal updates target', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/profile');
    await page.getByText('일일 학습 목표').click();
    await page.locator('[data-testid="goal-type-avgScore"]').click();
    const slider = page.locator('[data-testid="goal-target"]');
    await slider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, '90');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('[data-testid="goal-save"]').click();
    await expect(page.getByText(/평균 90점/)).toBeVisible();
  });

  test('History page is empty before practice', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/history');
    await expect(page.locator('[data-testid="history-empty"]')).toBeVisible();
  });

  test('History page reflects an attempt after practice', async ({ page }) => {
    await mockBackend(page, { analysis: READY_RESPONSE });
    await page.goto('/');
    await clickCardByText(page, '병원 접수 어떻게 해요?');
    await page.getByRole('button', { name: '녹음 시작' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '정지' }).click();
    await page.waitForURL(/\/result$/, { timeout: 10_000 });
    // Wait for score card so recordAttempt has fired before we navigate.
    await expect(page.locator('[data-testid="score-card"]')).toBeVisible();
    await page.waitForTimeout(200);

    await page.goto('/history');
    await expect(page.locator('[data-testid="history-session"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="history-session"]')).toContainText('병원 접수');
  });
});
