// Acceptance Test
// Traces to: T-030
// Description: PUT /api/counsellors/:id/rating — store, replace, aggregate, validation, auth.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const SEED = `${BASE}/api/dev/seed/counsellor`;

async function seedCounsellor(request: APIRequestContext, ts: string): Promise<string> {
  const r = await request.post(SEED, {
    data: { name: `Rating Dr. ${ts}`, denomination: 'Test', credentials: [], specialties: [], address: 'Ottawa, ON', phone: `+1-613-${ts.slice(-7)}`, source: 'web_research', verified: true },
  });
  return ((await r.json()) as { id: string }).id;
}

async function loginAs(request: APIRequestContext, suffix: string): Promise<void> {
  const email = `rating-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
}

test.describe('PUT /api/counsellors/:id/rating', () => {
  test('first PUT stores rating and updates aggregate', async ({ request }) => {
    const ts = String(Date.now());
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);

    const res = await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 4 } });
    expect(res.status()).toBe(200);

    const profile = await (await request.get(`${BASE}/api/counsellors/${id}`)).json() as { rating: number; reviewCount: number };
    expect(profile.reviewCount).toBe(1);
    expect(profile.rating).toBe(4.0);
  });

  test('second PUT from same user replaces, aggregate reflects update', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);

    await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 3 } });
    await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 5 } });

    const profile = await (await request.get(`${BASE}/api/counsellors/${id}`)).json() as { rating: number; reviewCount: number };
    expect(profile.reviewCount).toBe(1);
    expect(profile.rating).toBe(5.0);
  });

  test('two different users → aggregate averages both', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts + 'a');
    await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 2 } });
    await loginAs(request, ts + 'b');
    await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 4 } });

    const profile = await (await request.get(`${BASE}/api/counsellors/${id}`)).json() as { rating: number; reviewCount: number };
    expect(profile.reviewCount).toBe(2);
    expect(profile.rating).toBe(3.0);
  });

  test('stars=0 → 400', async ({ request }) => {
    const ts = String(Date.now() + 3);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const res = await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 0 } });
    expect(res.status()).toBe(400);
  });

  test('stars=6 → 400', async ({ request }) => {
    const ts = String(Date.now() + 4);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const res = await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 6 } });
    expect(res.status()).toBe(400);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const ts = String(Date.now() + 5);
    const id = await seedCounsellor(request, ts);
    const res = await request.put(`${BASE}/api/counsellors/${id}/rating`, { data: { stars: 3 } });
    expect(res.status()).toBe(401);
  });
});
