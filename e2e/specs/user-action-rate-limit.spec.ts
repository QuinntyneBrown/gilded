// Acceptance Test
// Traces to: T-046
// Description: Per-user creation rate limit — 21st review/comment/public-note in one hour returns 429.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function loginAs(request: APIRequestContext, suffix: string): Promise<void> {
  const email = `ual-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
}

test.describe('Per-user creation rate limit', () => {
  test('21st public note creation in one hour → 429', async ({ request }) => {
    const ts = String(Date.now());
    await loginAs(request, ts);
    const body = 'A faith-based counselling reflection for the community today.';

    for (let i = 0; i < 20; i++) {
      const res = await request.post(`${BASE}/api/notes?visibility=public`, { data: { body: `${body} ${i}` } });
      expect(res.status()).toBe(201);
    }

    const res = await request.post(`${BASE}/api/notes?visibility=public`, { data: { body } });
    expect(res.status()).toBe(429);
    expect(res.headers()['retry-after']).toBeTruthy();
  });

  test('different user is not affected by another user\'s limit', async ({ browser }) => {
    const ts = String(Date.now() + 1);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await loginAs(ctxA.request, ts + 'a');
    await loginAs(ctxB.request, ts + 'b');

    const body = 'A faith-based counselling reflection for the community today.';
    for (let i = 0; i < 20; i++) {
      await ctxA.request.post(`${BASE}/api/notes?visibility=public`, { data: { body: `${body} ${i}` } });
    }

    const res = await ctxB.request.post(`${BASE}/api/notes?visibility=public`, { data: { body } });
    expect(res.status()).toBe(201);
    await ctxA.close(); await ctxB.close();
  });
});
