import { test, expect } from '@playwright/test';
import { mockBackend } from './fixtures';

// The /admin authoring tool is local-only (gated by hostname). Under Playwright
// the app is served from localhost, so the page is reachable and these flows
// exercise the localStorage-backed add → merge-into-list path end to end.
test.describe('Admin card authoring (local-only)', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  test('adds a phoneme card and it appears in the custom list + home', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('[data-testid="admin-tab-phoneme"]')).toBeVisible();

    await page.locator('[data-testid="admin-phoneme-korean"]').fill('테스트 문장이에요.');
    await page.locator('[data-testid="admin-phoneme-russian"]').fill('Это тестовое предложение.');
    await page.locator('input[placeholder*="버스나 지하철"]').fill('테스트 안내 문구.');
    await page.locator('[data-testid="admin-phoneme-add"]').click();

    // Shows up in the custom list.
    await expect(page.locator('[data-testid="admin-custom-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="admin-custom-row"]')).toContainText('테스트 문장이에요.');

    // And merges into the home pronunciation list (category 생활문장 default tab).
    await page.goto('/');
    await expect(page.locator('[data-testid="card-row"]').filter({ hasText: '테스트 문장이에요.' })).toBeVisible();
  });

  test('adds a situation card and it appears in the custom list + situations tab', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('[data-testid="admin-tab-situation"]').click();

    await page.locator('[data-testid="admin-situation-title"]').fill('테스트 상황');
    await page.locator('[data-testid="admin-situation-location"]').fill('테스트 장소');
    await page.locator('[data-testid="admin-situation-puzzle-0"]').fill('나는 테스트를 했어요.');
    await page.locator('[data-testid="admin-situation-add"]').click();

    await expect(page.locator('[data-testid="admin-custom-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="admin-custom-row"]')).toContainText('테스트 상황');

    // Appears in the situations tab on home.
    await page.goto('/');
    await page.locator('[data-testid="mode-situation"]').click();
    await expect(
      page.locator('[data-testid="situation-card"]').filter({ hasText: '테스트 상황' }),
    ).toBeVisible();
  });

  test('exported JSON download is offered once a card exists', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('[data-testid="admin-phoneme-korean"]').fill('내보내기 문장.');
    await page.locator('[data-testid="admin-phoneme-russian"]').fill('Экспорт.');
    await page.locator('input[placeholder*="버스나 지하철"]').fill('안내.');
    await page.locator('[data-testid="admin-phoneme-add"]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="admin-export"]').click(),
    ]);
    expect(download.suggestedFilename()).toBe('custom-phoneme-cards.json');
  });
});
