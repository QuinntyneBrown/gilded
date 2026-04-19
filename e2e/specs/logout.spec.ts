// Acceptance Test
// Traces to: T-011
// Description: Logout invalidates session; replaying the cookie returns 401.

import { expect, test } from '@playwright/test';

const SIGNUP = 'http://127.0.0.1:3000/api/auth/signup';
const VERIFY = 'http://127.0.0.1:3000/api/auth/verify';
const LOGIN = 'http://127.0.0.1:3000/api/auth/login';
const LOGOUT = 'http://127.0.0.1:3000/api/auth/logout';
const ME = 'http://127.0.0.1:3000/api/auth/me';
const LAST_TOKEN = (email: string) =>
  `http://127.0.0.1:3000/api/dev/last-token?email=${encodeURIComponent(email)}`;

const PASSWORD = 'ValidPass123!';

test('logout invalidates session; replayed cookie returns 401', async ({ request }) => {
  const email = `logout-${Date.now()}@example.com`;

  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);

  const loginRes = await request.post(LOGIN, { data: { email, password: PASSWORD } });
  expect(loginRes.status()).toBe(200);
  const cookies = loginRes.headers()['set-cookie'] ?? '';
  const sid = cookies.match(/sid=([^;]+)/)?.[1] ?? '';
  expect(sid).toBeTruthy();

  const meRes = await request.get(ME, { headers: { Cookie: `sid=${sid}` } });
  expect(meRes.status()).toBe(200);

  const logoutRes = await request.post(LOGOUT, { headers: { Cookie: `sid=${sid}` } });
  expect(logoutRes.status()).toBe(204);

  const replayRes = await request.get(ME, { headers: { Cookie: `sid=${sid}` } });
  expect(replayRes.status()).toBe(401);
});
