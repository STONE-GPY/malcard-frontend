// End-to-end smoke test: verifies the frontend loaded against the real backend.
// Asserts:
//   1. /cards XHR fired against http://localhost:8000 and returned 200
//   2. Cards rendered on the home screen
//   3. No console errors
import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 480, height: 920 },
  locale: 'ko-KR',
});
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

const cardsRequests = [];
page.on('response', async (res) => {
  const u = res.url();
  if (u.startsWith(BACKEND_URL)) {
    cardsRequests.push({ url: u, status: res.status() });
  }
});

console.log(`[1/4] Navigating to ${FRONTEND_URL}...`);
await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 15000 });

console.log('[2/4] Waiting for any card text from backend...');
// life_01 = "어디서 내려요?" — comes from real backend /cards
await page.waitForSelector('text=/어디서 내려요|얼마예요|이거 주세요/', { timeout: 10000 });

const visibleText = await page.locator('body').innerText();
const hasKoreanCards = /어디서 내려요|얼마예요|이거 주세요/.test(visibleText);

console.log('[3/4] Checking backend network calls...');
const cardCalls = cardsRequests.filter((r) => r.url.includes('/cards'));
console.log('  Backend calls captured:', cardsRequests.length);
for (const r of cardsRequests) console.log('   -', r.status, r.url);

console.log('[4/4] Console errors:', consoleErrors.length);
for (const e of consoleErrors) console.log('   ✗', e);

await page.screenshot({ path: 'integration-smoke.png', fullPage: true });
await browser.close();

const pass =
  hasKoreanCards &&
  cardCalls.some((r) => r.status === 200) &&
  consoleErrors.length === 0;

console.log('\n========================================');
console.log(pass ? 'PASS — frontend ↔ backend integration OK' : 'FAIL');
console.log('========================================');
process.exit(pass ? 0 : 1);
