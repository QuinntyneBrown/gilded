// Acceptance Test
// Traces to: T-042
// Description: Public notes CRUD — all authenticated users read; moderation; author's displayName shown.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function loginAs(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `pubnote-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

const BODY = 'Grateful for the faith-based counselling we received from this wonderful practice.';

test.describe('POST /api/notes?visibility=public', () => {
  test('creates public note → 201', async ({ request }) => {
    const ts = String(Date.now());
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/notes?visibility=public`, { data: { body: BODY } });
    expect(res.status()).toBe(201);
    const note = await res.json() as { id: string; visibility: string; authorDisplay: string };
    expect(note.id).toBeTruthy();
    expect(note.visibility).toBe('public');
    expect(note.authorDisplay).not.toContain('@');
  });

  test('profane content → 422', async ({ request }) => {
    const ts = String(Date.now() + 1);
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/notes?visibility=public`, {
      data: { body: 'This counsellor is total crap and I hate this damn experience so much.' },
    });
    expect(res.status()).toBe(422);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/notes?visibility=public`, { data: { body: BODY } });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/notes/public (feed)', () => {
  test('any authenticated user can read public notes', async ({ browser }) => {
    const ts = String(Date.now() + 2);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    await loginAs(ctx1.request, ts + 'a');
    await loginAs(ctx2.request, ts + 'b');
    await ctx1.request.post(`${BASE}/api/notes?visibility=public`, { data: { body: BODY } });
    const feed = await (await ctx2.request.get(`${BASE}/api/notes/public`)).json() as { body: string }[];
    expect(feed.some(n => n.body === BODY)).toBe(true);
    await ctx1.close(); await ctx2.close();
  });

  test('returns latest-first', async ({ request }) => {
    const ts = String(Date.now() + 3);
    await loginAs(request, ts);
    const first = 'First public note for counselling journey here.';
    const second = 'Second public note for counselling journey here.';
    await request.post(`${BASE}/api/notes?visibility=public`, { data: { body: first } });
    await request.post(`${BASE}/api/notes?visibility=public`, { data: { body: second } });
    const feed = await (await request.get(`${BASE}/api/notes/public`)).json() as { body: string }[];
    const filtered = feed.filter(n => n.body === first || n.body === second);
    expect(filtered[0].body).toBe(second);
  });
});

test.describe('PUT /api/notes/:id (public)', () => {
  test('non-author update → 403', async ({ browser }) => {
    const ts = String(Date.now() + 4);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    await loginAs(ctx1.request, ts + 'a');
    await loginAs(ctx2.request, ts + 'b');
    const { id } = await (await ctx1.request.post(`${BASE}/api/notes?visibility=public`, { data: { body: BODY } })).json() as { id: string };
    const res = await ctx2.request.put(`${BASE}/api/notes/${id}`, { data: { body: 'Trying to overwrite public note.' } });
    expect(res.status()).toBe(403);
    await ctx1.close(); await ctx2.close();
  });
});
