import { defineConfig, devices } from '@playwright/test';

const appPort = process.env['APP_PORT'] ?? '43120';
const apiPort = process.env['API_PORT'] ?? '43121';
const appBaseURL = process.env['APP_BASE_URL'] ?? `http://localhost:${appPort}`;
const apiBaseURL = process.env['API_BASE_URL'] ?? `http://localhost:${apiPort}`;

process.env['APP_PORT'] = appPort;
process.env['API_PORT'] = apiPort;
process.env['APP_BASE_URL'] = appBaseURL;
process.env['API_BASE_URL'] = apiBaseURL;

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  webServer: [
    {
      command: 'npm run dev --workspace backend',
      url: `${apiBaseURL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { CAPTURE_EMAILS: '1', CAPTCHA_DISABLED: '1', PORT: apiPort },
    },
    {
      command: `npm run dev --workspace frontend -- --port ${appPort}`,
      url: appBaseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PORT: apiPort },
    },
  ],
  use: { baseURL: appBaseURL },
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
