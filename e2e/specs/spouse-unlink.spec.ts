// Acceptance Test
// Traces to: T-017
// Description: Unlink dissolves couple; both users' spouseId/coupleId cleared; CoupleDissolved event emitted; both can re-couple.

import { expect, test } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SIGNUP = `${BASE}/api/auth/signup`;
const VERIFY = `${BASE}/api/auth/verify`;
const LOGIN = `${BASE}/api/auth/login`;
const INVITE = `${BASE}/api/couple/invite`;
const ACCEPT = `${BASE}/api/couple/accept`;
const UNLINK = `${BASE}/api/couple/unlink`;
const LAST_TOKEN = (email: string) => `${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`;
const DEV_USER = (email: string) => `${BASE}/api/dev/user?email=${encodeURIComponent(email)}`;
const DEV_EVENTS = `${BASE}/api/dev/events`;

const PASSWORD = 'ValidPass123!';

type ApiRequest = Parameters<Parameters<typeof test>[1]>[0]['request'];

async function createActiveUser(request: ApiRequest, email: string): Promise<string> {
  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);
  const loginRes = await request.post(LOGIN, { data: { email, password: PASSWORD } });
  const sid = loginRes.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? '';
  return `sid=${sid}`;
}

async function formCouple(request: ApiRequest, emailA: string, emailB: string): Promise<{ cookieA: string; cookieB: string }> {
  const cookieA = await createActiveUser(request, emailA);
  const cookieB = await createActiveUser(request, emailB);

  await request.post(INVITE, { data: { email: emailB }, headers: { Cookie: cookieA } });
  const { token } = await (await request.get(LAST_TOKEN(emailB))).json() as { token: string };
  await request.post(ACCEPT, { data: { token }, headers: { Cookie: cookieB } });

  return { cookieA, cookieB };
}

test.describe('POST /api/couple/unlink', () => {
  test('happy path: unlink clears both users', async ({ request }) => {
    const ts = Date.now();
    const emailA = `ul-a-${ts}@example.com`;
    const emailB = `ul-b-${ts}@example.com`;
    const { cookieA } = await formCouple(request, emailA, emailB);

    const res = await request.post(UNLINK, { headers: { Cookie: cookieA } });
    expect(res.status()).toBe(200);

    const userA = await (await request.get(DEV_USER(emailA))).json() as { coupleId?: string; spouseId?: string };
    const userB = await (await request.get(DEV_USER(emailB))).json() as { coupleId?: string; spouseId?: string };
    expect(userA.coupleId).toBeFalsy();
    expect(userA.spouseId).toBeFalsy();
    expect(userB.coupleId).toBeFalsy();
    expect(userB.spouseId).toBeFalsy();
  });

  test('CoupleDissolved event is emitted', async ({ request }) => {
    const ts = Date.now() + 1;
    const emailA = `ev-a-${ts}@example.com`;
    const emailB = `ev-b-${ts}@example.com`;
    const { cookieA } = await formCouple(request, emailA, emailB);

    await request.post(UNLINK, { headers: { Cookie: cookieA } });

    const { events } = await (await request.get(DEV_EVENTS)).json() as { events: { type: string }[] };
    const dissolved = events.filter(e => e.type === 'CoupleDissolved');
    expect(dissolved.length).toBeGreaterThan(0);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const res = await request.post(UNLINK);
    expect(res.status()).toBe(401);
  });

  test('not in a couple → 409', async ({ request }) => {
    const ts = Date.now() + 2;
    const email = `solo-ul-${ts}@example.com`;
    const cookie = await createActiveUser(request, email);

    const res = await request.post(UNLINK, { headers: { Cookie: cookie } });
    expect(res.status()).toBe(409);
  });

  test('after unlink both users can form new couples', async ({ request }) => {
    const ts = Date.now() + 3;
    const emailA = `recouple-a-${ts}@example.com`;
    const emailB = `recouple-b-${ts}@example.com`;
    const { cookieA } = await formCouple(request, emailA, emailB);

    await request.post(UNLINK, { headers: { Cookie: cookieA } });

    const emailC = `recouple-c-${ts}@example.com`;
    await createActiveUser(request, emailC);

    const loginRes = await request.post(LOGIN, { data: { email: emailA, password: PASSWORD } });
    const newCookieA = `sid=${loginRes.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? ''}`;

    const inviteRes = await request.post(INVITE, { data: { email: emailC }, headers: { Cookie: newCookieA } });
    expect(inviteRes.status()).toBe(200);
  });
});
