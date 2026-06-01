import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const linuxChromePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browserArgs = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
];
const launchOptions = process.platform === 'linux' && existsSync(linuxChromePath)
  ? { executablePath: linuxChromePath, args: browserArgs }
  : { args: browserArgs };
const devServerCommand = process.platform === 'win32'
  ? 'cmd /c "set VITE_USE_MOCK_API=false&& set VITE_API_BASE_URL=http://api.test&& npm run dev -- --port 5173 --strictPort"'
  : 'npm run dev:test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'ko-KR',
    launchOptions,
    permissions: ['microphone'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 480, height: 920 } },
    },
  ],
  webServer: {
    command: devServerCommand,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
