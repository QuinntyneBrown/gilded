import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  webServer: [
    {
      command: 'npm run dev:backend',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://127.0.0.1:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ],
  use: {
    baseURL: 'http://127.0.0.1:4200'
  }
});
