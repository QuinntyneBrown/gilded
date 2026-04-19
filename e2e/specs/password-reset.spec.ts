// Acceptance Test
// Traces to: T-012
// Description: Password reset request + complete flow over HTTP.

import { expect, test } from '@playwright/test';

const SIGNUP = 'http://127.0.0.1:3000/api/auth/signup';
const VERIFY = 'http://127.0.0.1:3000/api/auth/verify';
const LOGIN = 'http://127.0.0.1:3000/api/auth/login';
const ME = 'http://127.0.0.1:3000/api/auth/me';
const RESET_REQ = 'http://127.0.0.1:3000/api/auth/reset-request';
const RESET_COMPLETE = 'http://127.0.0.1:3000/api/auth/reset-complete';
const LAST_TOKEN = (email: string) =>
  `http://127.0.0.1:3000/api/dev/last-token?email=${encodeURIComponent(email)}`;

const PASSWORD = 'ValidPass123!';
const NEW_PASSWORD = 'NewSecure456@';

async function signupAndVerify(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  email: string,
): Promise<void> {
  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);
}

test.describe('POST /api/auth/reset-request', () => {
  test('unknown email → 200, no token sent', async ({ request }) => {
    const res = await request.post(RESET_REQ, { data: { email: `ghost-${Date.now()}@example.com` } });
    expect(res.status()).toBe(200);
  });

  test('known active email → 200 and token emitted', async ({ request }) => {
    const email = `reset-req-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    const res = await request.post(RESET_REQ, { data: { email } });
    expect(res.status()).toBe(200);

    const tokenRes = await request.get(LAST_TOKEN(email));
    expect(tokenRes.status()).toBe(200);
    const { token } = await tokenRes.json() as { token: string };
    expect(token.length).toBeGreaterThan(0);
  });
});

test.describe('POST /api/auth/reset-complete', () => {
  test('valid token + compliant password → 200, prior session invalidated', async ({ request }) => {
    const email = `reset-ok-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    const loginRes = await request.post(LOGIN, { data: { email, password: PASSWORD } });
    const sid = loginRes.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? '';
    expect(sid).toBeTruthy();

    await request.post(RESET_REQ, { data: { email } });
    const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };

    const res = await request.post(RESET_COMPLETE, { data: { token, newPassword: NEW_PASSWORD } });
    expect(res.status()).toBe(200);

    const replayRes = await request.get(ME, { headers: { Cookie: `sid=${sid}` } });
    expect(replayRes.status()).toBe(401);

    const newLoginRes = await request.post(LOGIN, { data: { email, password: NEW_PASSWORD } });
    expect(newLoginRes.status()).toBe(200);
  });

  test('reused token → 400', async ({ request }) => {
    const email = `reset-reuse-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    await request.post(RESET_REQ, { data: { email } });
    const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };

    await request.post(RESET_COMPLETE, { data: { token, newPassword: NEW_PASSWORD } });
    const res = await request.post(RESET_COMPLETE, { data: { token, newPassword: NEW_PASSWORD } });
    expect(res.status()).toBe(400);
  });

  test('invalid token → 400', async ({ request }) => {
    const res = await request.post(RESET_COMPLETE, { data: { token: 'deadbeef', newPassword: NEW_PASSWORD } });
    expect(res.status()).toBe(400);
  });

  test('weak new password → 400', async ({ request }) => {
    const email = `reset-weak-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    await request.post(RESET_REQ, { data: { email } });
    const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };

    const res = await request.post(RESET_COMPLETE, { data: { token, newPassword: 'weak' } });
    expect(res.status()).toBe(400);
  });
});
