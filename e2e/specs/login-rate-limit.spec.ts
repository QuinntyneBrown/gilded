// Acceptance Test
// Traces to: T-010
// Description: 5 failed logins trigger 429; a different IP is not affected.

import { expect, test } from '@playwright/test';

const LOGIN = 'http://127.0.0.1:3000/api/auth/login';

test.describe('Login rate limiting', () => {
  test('6th failed login returns 429 with Retry-After', async ({ request }) => {
    const email = `ratelimit-${Date.now()}@example.com`;
    const ip = `192.168.${Math.floor(Math.random() * 254) + 1}.1`;
    const headers = { 'X-Forwarded-For': ip };

    for (let i = 0; i < 5; i++) {
      const res = await request.post(LOGIN, {
        data: { email, password: 'WrongPass456@' },
        headers,
      });
      expect(res.status()).toBe(401);
    }

    const res = await request.post(LOGIN, {
      data: { email, password: 'WrongPass456@' },
      headers,
    });
    expect(res.status()).toBe(429);
    expect(res.headers()['retry-after']).toBeTruthy();
  });

  test('different IP for same email is not locked out', async ({ request }) => {
    const email = `ratelimit-ip-${Date.now()}@example.com`;
    const ip1 = `172.16.${Math.floor(Math.random() * 254) + 1}.1`;
    const ip2 = `172.17.${Math.floor(Math.random() * 254) + 1}.1`;

    for (let i = 0; i < 5; i++) {
      await request.post(LOGIN, {
        data: { email, password: 'WrongPass456@' },
        headers: { 'X-Forwarded-For': ip1 },
      });
    }

    const res = await request.post(LOGIN, {
      data: { email, password: 'WrongPass456@' },
      headers: { 'X-Forwarded-For': ip2 },
    });
    expect(res.status()).toBe(401);
  });
});
