import { defineConfig, devices } from '@playwright/test';

const port = process.env['APP_PORT'] ?? '4200';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  webServer: [
    {
      command: 'npm run dev:backend',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      env: { CAPTURE_EMAILS: '1', CAPTCHA_DISABLED: '1' },
    },
    {
      command: `npm run dev:frontend -- --port ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
  use: { baseURL },
  projects: [
    {
      name: 'perf-budgets',
      use: { ...devices['Moto G4'] },
      testMatch: '**/perf/**/*.spec.ts',
    },
    { name: 'chromium-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } } },
    { name: 'chromium-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'chromium-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'webkit-360', use: { ...devices['Desktop Safari'], viewport: { width: 360, height: 780 } } },
    { name: 'webkit-768', use: { ...devices['Desktop Safari'], viewport: { width: 768, height: 1024 } } },
    { name: 'webkit-1280', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'firefox-360', use: { ...devices['Desktop Firefox'], viewport: { width: 360, height: 780 } } },
    { name: 'firefox-768', use: { ...devices['Desktop Firefox'], viewport: { width: 768, height: 1024 } } },
    { name: 'firefox-1280', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
  ],
});
