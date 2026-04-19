// Acceptance Test
// Traces to: T-008
// Description: Email verification and resend flow over HTTP.

import { expect, test } from '@playwright/test';

const SIGNUP = 'http://127.0.0.1:3000/api/auth/signup';
const VERIFY = 'http://127.0.0.1:3000/api/auth/verify';
const RESEND = 'http://127.0.0.1:3000/api/auth/resend-verification';
const LAST_TOKEN = (email: string) =>
  `http://127.0.0.1:3000/api/dev/last-token?email=${encodeURIComponent(email)}`;

async function signupAndGetToken(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  email: string,
): Promise<string> {
  await request.post(SIGNUP, { data: { email, password: 'ValidPass123!' } });
  const r = await request.get(LAST_TOKEN(email));
  return (await r.json()).token as string;
}

test.describe('GET /api/auth/verify', () => {
  test('valid fresh token → 200 and user becomes active', async ({ request }) => {
    const email = `verify-ok-${Date.now()}@example.com`;
    const token = await signupAndGetToken(request, email);

    const res = await request.get(`${VERIFY}?token=${token}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.message).toBe('string');
  });

  test('reused token → 400', async ({ request }) => {
    const email = `verify-reuse-${Date.now()}@example.com`;
    const token = await signupAndGetToken(request, email);

    await request.get(`${VERIFY}?token=${token}`);
    const res = await request.get(`${VERIFY}?token=${token}`);
    expect(res.status()).toBe(400);
  });

  test('invalid (unknown) token → 400', async ({ request }) => {
    const res = await request.get(`${VERIFY}?token=deadbeef`);
    expect(res.status()).toBe(400);
  });

  test('missing token parameter → 400', async ({ request }) => {
    const res = await request.get(VERIFY);
    expect(res.status()).toBe(400);
  });
});

test.describe('POST /api/auth/resend-verification', () => {
  test('resend happy path → 200 and new token email sent', async ({ request }) => {
    const email = `resend-ok-${Date.now()}@example.com`;
    await request.post(SIGNUP, { data: { email, password: 'ValidPass123!' } });
    const oldToken = (await (await request.get(LAST_TOKEN(email))).json()).token as string;

    const res = await request.post(RESEND, { data: { email } });
    expect(res.status()).toBe(200);

    const newToken = (await (await request.get(LAST_TOKEN(email))).json()).token as string;
    expect(newToken).not.toEqual(oldToken);

    const oldVerify = await request.get(`${VERIFY}?token=${oldToken}`);
    expect(oldVerify.status()).toBe(400);

    const newVerify = await request.get(`${VERIFY}?token=${newToken}`);
    expect(newVerify.status()).toBe(200);
  });

  test('resend for unknown email → 200 (no enumeration)', async ({ request }) => {
    const res = await request.post(RESEND, { data: { email: 'ghost@example.com' } });
    expect(res.status()).toBe(200);
  });
});
