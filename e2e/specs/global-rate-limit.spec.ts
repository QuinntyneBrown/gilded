// Acceptance Test
// Traces to: T-045
// Description: Global per-IP rate limiting — 11 requests in 1 minute triggers 429 on abuse-prone endpoints.

import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

const ENDPOINTS: Array<{ path: string; data: Record<string, string> }> = [
  { path: '/api/auth/signup', data: { email: 'rl@example.com', password: 'Pass1!' } },
  { path: '/api/auth/login', data: { email: 'rl@example.com', password: 'Pass1!' } },
  { path: '/api/auth/reset-request', data: { email: 'rl@example.com' } },
  { path: '/api/couple/invite', data: { email: 'rl@example.com' } },
];

for (const ep of ENDPOINTS) {
  test.describe(`Rate limit: ${ep.path}`, () => {
    test('11 requests from same IP in 1 minute → 11th is 429', async ({ request }) => {
      const ip = `10.100.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
      const headers = { 'X-Forwarded-For': ip };

      for (let i = 0; i < 10; i++) {
        await request.post(`${BASE}${ep.path}`, { data: ep.data, headers });
      }

      const res = await request.post(`${BASE}${ep.path}`, { data: ep.data, headers });
      expect(res.status()).toBe(429);
      expect(res.headers()['retry-after']).toBeTruthy();
    });

    test('different IP is not rate-limited', async ({ request }) => {
      const ip1 = `10.200.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
      const ip2 = `10.201.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

      for (let i = 0; i < 10; i++) {
        await request.post(`${BASE}${ep.path}`, { data: ep.data, headers: { 'X-Forwarded-For': ip1 } });
      }

      const res = await request.post(`${BASE}${ep.path}`, { data: ep.data, headers: { 'X-Forwarded-For': ip2 } });
      expect(res.status()).not.toBe(429);
    });
  });
}
