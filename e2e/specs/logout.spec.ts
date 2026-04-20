// Acceptance Test
// Traces to: T-011
// Description: Logout invalidates session; replaying the cookie returns 401.

import { expect, test } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SIGNUP = `${BASE}/api/auth/signup`;
const VERIFY = `${BASE}/api/auth/verify`;
const LOGIN = `${BASE}/api/auth/login`;
const LOGOUT = `${BASE}/api/auth/logout`;
const ME = `${BASE}/api/auth/me`;
const LAST_TOKEN = (email: string) =>
  `${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`;

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
