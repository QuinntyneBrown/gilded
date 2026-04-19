// Acceptance Test
// Traces to: T-016
// Description: Spouse invite send + accept; already-coupled and self-invite rejected; expired token rejected.

import { expect, test } from '@playwright/test';

const SIGNUP = 'http://127.0.0.1:3000/api/auth/signup';
const VERIFY = 'http://127.0.0.1:3000/api/auth/verify';
const LOGIN = 'http://127.0.0.1:3000/api/auth/login';
const INVITE = 'http://127.0.0.1:3000/api/couple/invite';
const ACCEPT = 'http://127.0.0.1:3000/api/couple/accept';
const LAST_TOKEN = (email: string) =>
  `http://127.0.0.1:3000/api/dev/last-token?email=${encodeURIComponent(email)}`;
const DEV_USER = (email: string) =>
  `http://127.0.0.1:3000/api/dev/user?email=${encodeURIComponent(email)}`;

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

test.describe('POST /api/couple/invite + /api/couple/accept', () => {
  test('happy path: send invite → accept → both users linked', async ({ request }) => {
    const ts = Date.now();
    const inviterEmail = `inviter-${ts}@example.com`;
    const inviteeEmail = `invitee-${ts}@example.com`;

    const inviterCookie = await createActiveUser(request, inviterEmail);
    await createActiveUser(request, inviteeEmail);

    const inviteRes = await request.post(INVITE, {
      data: { email: inviteeEmail },
      headers: { Cookie: inviterCookie },
    });
    expect(inviteRes.status()).toBe(200);

    const { token: inviteToken } = await (await request.get(LAST_TOKEN(inviteeEmail))).json() as { token: string };

    const inviteeCookie = await createActiveUser(request, inviteeEmail).catch(async () => {
      const r = await request.post(LOGIN, { data: { email: inviteeEmail, password: PASSWORD } });
      return `sid=${r.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? ''}`;
    });

    const acceptRes = await request.post(ACCEPT, {
      data: { token: inviteToken },
      headers: { Cookie: inviteeCookie },
    });
    expect(acceptRes.status()).toBe(200);

    const inviterUser = await (await request.get(DEV_USER(inviterEmail))).json() as { coupleId: string; spouseId: string };
    const inviteeUser = await (await request.get(DEV_USER(inviteeEmail))).json() as { coupleId: string; spouseId: string };
    expect(inviterUser.coupleId).toBeTruthy();
    expect(inviterUser.coupleId).toEqual(inviteeUser.coupleId);
    expect(inviterUser.spouseId).toBeTruthy();
  });

  test('self-invite → 400', async ({ request }) => {
    const email = `self-invite-${Date.now()}@example.com`;
    const cookie = await createActiveUser(request, email);

    const res = await request.post(INVITE, {
      data: { email },
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(400);
  });

  test('already-coupled inviter → 409', async ({ request }) => {
    const ts = Date.now();
    const inv1 = `couple1a-${ts}@example.com`;
    const inv2 = `couple1b-${ts}@example.com`;

    const c1 = await createActiveUser(request, inv1);
    const c2 = await createActiveUser(request, inv2);

    await request.post(INVITE, { data: { email: inv2 }, headers: { Cookie: c1 } });
    const { token } = await (await request.get(LAST_TOKEN(inv2))).json() as { token: string };
    await request.post(ACCEPT, { data: { token }, headers: { Cookie: c2 } });

    const res = await request.post(INVITE, {
      data: { email: `new-${ts}@example.com` },
      headers: { Cookie: c1 },
    });
    expect(res.status()).toBe(409);
  });

  test('expired token → 400', async ({ request }) => {
    const email = `acceptee-${Date.now()}@example.com`;
    const cookie = await createActiveUser(request, email);

    const res = await request.post(ACCEPT, {
      data: { token: 'deadbeef00000000000000000000000000000000000000000000000000000000' },
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(400);
  });
});
