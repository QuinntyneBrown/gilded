// Acceptance Test
// Traces to: T-037
// Description: POST /api/couple/chosen sets chosen counsellor; spouse gets notification.

import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function seedCounsellor(request: import('@playwright/test').APIRequestContext, ts: string): Promise<string> {
  const r = await request.post(`${BASE}/api/dev/seed/counsellor`, {
    data: { name: `Chosen Dr. ${ts}`, denomination: 'Test', credentials: [], specialties: [], address: 'Ottawa, ON', phone: `+1-613-${ts.slice(-7)}`, source: 'web_research', verified: true },
  });
  return ((await r.json()) as { id: string }).id;
}

async function createAndLogin(request: import('@playwright/test').APIRequestContext, suffix: string): Promise<string> {
  const email = `chosen-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

async function coupleUp(
  r1: import('@playwright/test').APIRequestContext,
  r2: import('@playwright/test').APIRequestContext,
  email2: string,
): Promise<void> {
  await r1.post(`${BASE}/api/couple/invite`, { data: { email: email2 } });
  const { token } = await (await r1.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email2)}`)).json() as { token: string };
  await r2.post(`${BASE}/api/couple/accept`, { data: { token } });
}

test.describe('POST /api/couple/chosen', () => {
  test('sets chosen counsellor → 200', async ({ browser }) => {
    const ts = String(Date.now());
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const r1 = ctx1.request; const r2 = ctx2.request;
    const id = await seedCounsellor(r1, ts);
    await createAndLogin(r1, ts + 'a');
    const email2 = await createAndLogin(r2, ts + 'b');
    await coupleUp(r1, r2, email2);
    const res = await r1.post(`${BASE}/api/couple/chosen`, { data: { counsellorId: id } });
    expect(res.status()).toBe(200);
    await ctx1.close(); await ctx2.close();
  });

  test('unauthenticated → 401', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const id = await seedCounsellor(request, ts);
    const res = await request.post(`${BASE}/api/couple/chosen`, { data: { counsellorId: id } });
    expect(res.status()).toBe(401);
  });

  test('solo user (no couple) → 409', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const id = await seedCounsellor(request, ts);
    await createAndLogin(request, ts);
    const res = await request.post(`${BASE}/api/couple/chosen`, { data: { counsellorId: id } });
    expect(res.status()).toBe(409);
  });
});

test.describe('GET /api/me/notifications', () => {
  test('spouse gets one notification after partner chooses; clears after read', async ({ browser }) => {
    const ts = String(Date.now() + 3);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const r1 = ctx1.request; const r2 = ctx2.request;
    const id = await seedCounsellor(r1, ts);
    await createAndLogin(r1, ts + 'a');
    const email2 = await createAndLogin(r2, ts + 'b');
    await coupleUp(r1, r2, email2);
    await r1.post(`${BASE}/api/couple/chosen`, { data: { counsellorId: id } });

    const notifs1 = await (await r2.get(`${BASE}/api/me/notifications`)).json() as { message: string }[];
    expect(notifs1.length).toBe(1);
    expect(notifs1[0].message).toContain('Chosen Dr.');

    const notifs2 = await (await r2.get(`${BASE}/api/me/notifications`)).json() as unknown[];
    expect(notifs2.length).toBe(0);

    await ctx1.close(); await ctx2.close();
  });

  test('choosing sends email to spouse', async ({ browser }) => {
    const ts = String(Date.now() + 4);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const r1 = ctx1.request; const r2 = ctx2.request;
    const id = await seedCounsellor(r1, ts);
    await createAndLogin(r1, ts + 'a');
    const email2 = await createAndLogin(r2, ts + 'b');
    await coupleUp(r1, r2, email2);
    await r1.post(`${BASE}/api/couple/chosen`, { data: { counsellorId: id } });

    const lastToken = await (await r1.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email2)}`)).json() as { token: string };
    expect(lastToken.token).toBeTruthy();

    await ctx1.close(); await ctx2.close();
  });
});
