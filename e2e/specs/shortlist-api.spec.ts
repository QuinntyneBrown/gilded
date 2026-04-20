// Acceptance Test
// Traces to: T-035
// Description: POST/DELETE/GET /api/shortlist and couple-merge on link.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';

async function seedCounsellor(request: APIRequestContext, ts: string): Promise<string> {
  const r = await request.post(`${BASE}/api/dev/seed/counsellor`, {
    data: { name: `Shortlist Dr. ${ts}`, denomination: 'Test', credentials: [], specialties: [], address: 'Ottawa, ON', phone: `+1-613-${ts.slice(-7)}`, source: 'web_research', verified: true },
  });
  return ((await r.json()) as { id: string }).id;
}

async function createAndLoginUser(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `sl-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

test.describe('POST /api/shortlist/:counsellorId', () => {
  test('add counsellor to shortlist → 201', async ({ request }) => {
    const ts = String(Date.now());
    const id = await seedCounsellor(request, ts);
    await createAndLoginUser(request, ts);
    const res = await request.post(`${BASE}/api/shortlist/${id}`);
    expect(res.status()).toBe(201);
  });

  test('duplicate add → 200 (idempotent)', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const id = await seedCounsellor(request, ts);
    await createAndLoginUser(request, ts);
    await request.post(`${BASE}/api/shortlist/${id}`);
    const res = await request.post(`${BASE}/api/shortlist/${id}`);
    expect(res.status()).toBe(200);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const id = await seedCounsellor(request, ts);
    const res = await request.post(`${BASE}/api/shortlist/${id}`);
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/shortlist', () => {
  test('returns added counsellors', async ({ request }) => {
    const ts = String(Date.now() + 3);
    const id = await seedCounsellor(request, ts);
    await createAndLoginUser(request, ts);
    await request.post(`${BASE}/api/shortlist/${id}`);
    const items = await (await request.get(`${BASE}/api/shortlist`)).json() as { counsellorId: string }[];
    expect(items.some(i => i.counsellorId === id)).toBe(true);
  });
});

test.describe('DELETE /api/shortlist/:counsellorId', () => {
  test('remove counsellor from shortlist → 200', async ({ request }) => {
    const ts = String(Date.now() + 4);
    const id = await seedCounsellor(request, ts);
    await createAndLoginUser(request, ts);
    await request.post(`${BASE}/api/shortlist/${id}`);
    const res = await request.delete(`${BASE}/api/shortlist/${id}`);
    expect(res.status()).toBe(200);
    const items = await (await request.get(`${BASE}/api/shortlist`)).json() as { counsellorId: string }[];
    expect(items.some(i => i.counsellorId === id)).toBe(false);
  });
});

test.describe('Couple merge', () => {
  test('after couple link both spouses see union of shortlists', async ({ browser }) => {
    const ts = String(Date.now() + 5);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const r1 = ctx1.request;
    const r2 = ctx2.request;

    const id1 = await seedCounsellor(r1, ts + 'c1');
    const id2 = await seedCounsellor(r2, ts + 'c2');

    await createAndLoginUser(r1, ts + 'a');
    const email2 = await createAndLoginUser(r2, ts + 'b');

    await r1.post(`${BASE}/api/shortlist/${id1}`);
    await r2.post(`${BASE}/api/shortlist/${id2}`);

    await r1.post(`${BASE}/api/couple/invite`, { data: { email: email2 } });
    const { token } = await (await r1.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email2)}`)).json() as { token: string };
    await r2.post(`${BASE}/api/couple/accept`, { data: { token } });

    const list1 = await (await r1.get(`${BASE}/api/shortlist`)).json() as { counsellorId: string }[];
    const list2 = await (await r2.get(`${BASE}/api/shortlist`)).json() as { counsellorId: string }[];

    expect(list1.some(i => i.counsellorId === id1)).toBe(true);
    expect(list1.some(i => i.counsellorId === id2)).toBe(true);
    expect(list2.some(i => i.counsellorId === id1)).toBe(true);
    expect(list2.some(i => i.counsellorId === id2)).toBe(true);

    await ctx1.close();
    await ctx2.close();
  });
});
