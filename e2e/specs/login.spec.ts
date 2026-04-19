// Acceptance Test
// Traces to: T-009
// Description: POST /api/auth/login issues session cookie; invalid creds and unverified accounts are rejected.

import { expect, test } from '@playwright/test';

const SIGNUP = 'http://127.0.0.1:3000/api/auth/signup';
const VERIFY = 'http://127.0.0.1:3000/api/auth/verify';
const LOGIN = 'http://127.0.0.1:3000/api/auth/login';
const ME = 'http://127.0.0.1:3000/api/auth/me';
const LAST_TOKEN = (email: string) =>
  `http://127.0.0.1:3000/api/dev/last-token?email=${encodeURIComponent(email)}`;
const SESSION_INFO = (sid: string) =>
  `http://127.0.0.1:3000/api/dev/session?sid=${encodeURIComponent(sid)}`;

const PASSWORD = 'ValidPass123!';

async function signupAndVerify(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  email: string,
): Promise<void> {
  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const r = await request.get(LAST_TOKEN(email));
  const { token } = await r.json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);
}

test.describe('POST /api/auth/login', () => {
  test('valid credentials on active account → 200 + session cookie', async ({ request }) => {
    const email = `login-ok-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    const res = await request.post(LOGIN, { data: { email, password: PASSWORD } });
    expect(res.status()).toBe(200);

    const cookies = res.headers()['set-cookie'] ?? '';
    expect(cookies).toContain('sid=');
    expect(cookies.toLowerCase()).toContain('httponly');
    expect(cookies).toContain('SameSite=Lax');
  });

  test('invalid password → 401', async ({ request }) => {
    const email = `login-badpass-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    const res = await request.post(LOGIN, { data: { email, password: 'WrongPass456@' } });
    expect(res.status()).toBe(401);
  });

  test('unknown email → 401', async ({ request }) => {
    const res = await request.post(LOGIN, {
      data: { email: `nobody-${Date.now()}@example.com`, password: PASSWORD },
    });
    expect(res.status()).toBe(401);
  });

  test('unverified account → 401', async ({ request }) => {
    const email = `login-unverified-${Date.now()}@example.com`;
    await request.post(SIGNUP, { data: { email, password: PASSWORD } });

    const res = await request.post(LOGIN, { data: { email, password: PASSWORD } });
    expect(res.status()).toBe(401);
  });

  test('authenticated request via /api/auth/me refreshes lastSeenAt', async ({ request }) => {
    const email = `login-refresh-${Date.now()}@example.com`;
    await signupAndVerify(request, email);

    const loginRes = await request.post(LOGIN, { data: { email, password: PASSWORD } });
    expect(loginRes.status()).toBe(200);

    const cookies = loginRes.headers()['set-cookie'] ?? '';
    const sid = cookies.match(/sid=([^;]+)/)?.[1] ?? '';
    expect(sid).toBeTruthy();

    const before = await (await request.get(SESSION_INFO(sid))).json() as { lastSeenAt: string };

    await new Promise(r => setTimeout(r, 10));
    await request.get(ME, { headers: { Cookie: `sid=${sid}` } });

    const after = await (await request.get(SESSION_INFO(sid))).json() as { lastSeenAt: string };
    expect(new Date(after.lastSeenAt).getTime()).toBeGreaterThan(new Date(before.lastSeenAt).getTime());
  });
});
