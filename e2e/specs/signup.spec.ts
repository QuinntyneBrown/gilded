// Acceptance Test
// Traces to: T-007
// Description: POST /api/auth/signup creates accounts and prevents email enumeration.

import { expect, test } from '@playwright/test';

const SIGNUP = `${process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121'}/api/auth/signup`;

test.describe('POST /api/auth/signup', () => {
  test('valid signup returns 200 with generic message', async ({ request }) => {
    const res = await request.post(SIGNUP, {
      data: { email: `valid-${Date.now()}@example.com`, password: 'ValidPass123!' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.message).toBe('string');
  });

  test('duplicate email returns identical 200 response', async ({ request }) => {
    const email = `dup-${Date.now()}@example.com`;
    const password = 'ValidPass123!';

    const r1 = await request.post(SIGNUP, { data: { email, password } });
    expect(r1.status()).toBe(200);

    const r2 = await request.post(SIGNUP, { data: { email, password } });
    expect(r2.status()).toBe(200);
    expect(await r2.json()).toEqual(await r1.json());
  });

  test('weak password returns 400', async ({ request }) => {
    const res = await request.post(SIGNUP, {
      data: { email: 'user@example.com', password: 'weak' },
    });
    expect(res.status()).toBe(400);
  });

  test('missing password field returns 400', async ({ request }) => {
    const res = await request.post(SIGNUP, { data: { email: 'user@example.com' } });
    expect(res.status()).toBe(400);
  });

  test('missing email field returns 400', async ({ request }) => {
    const res = await request.post(SIGNUP, { data: { password: 'ValidPass123!' } });
    expect(res.status()).toBe(400);
  });
});
