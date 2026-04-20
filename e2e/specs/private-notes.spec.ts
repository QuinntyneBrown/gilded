// Acceptance Test
// Traces to: T-040
// Description: Private notes CRUD — only author can access; 403 for others.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';

async function loginAs(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `pnote-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

const BODY = 'This is a private reflection about the counselling session we had.';

test.describe('POST /api/notes (private)', () => {
  test('creates private note → 201 with id', async ({ request }) => {
    const ts = String(Date.now());
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } });
    expect(res.status()).toBe(201);
    const note = await res.json() as { id: string; body: string; visibility: string };
    expect(note.id).toBeTruthy();
    expect(note.body).toBe(BODY);
    expect(note.visibility).toBe('private');
  });

  test('unauthenticated → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/notes (private)', () => {
  test('lists only author notes', async ({ browser }) => {
    const ts = String(Date.now() + 1);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    await loginAs(ctx1.request, ts + 'a');
    await loginAs(ctx2.request, ts + 'b');
    await ctx1.request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } });
    const listA = await (await ctx1.request.get(`${BASE}/api/notes`)).json() as { body: string }[];
    const listB = await (await ctx2.request.get(`${BASE}/api/notes`)).json() as { body: string }[];
    expect(listA.length).toBe(1);
    expect(listB.length).toBe(0);
    await ctx1.close(); await ctx2.close();
  });
});

test.describe('PUT /api/notes/:id (private)', () => {
  test('author can update body', async ({ request }) => {
    const ts = String(Date.now() + 2);
    await loginAs(request, ts);
    const { id } = await (await request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } })).json() as { id: string };
    const updated = 'Updated private note body with more than twenty chars.';
    const res = await request.put(`${BASE}/api/notes/${id}`, { data: { body: updated } });
    expect(res.status()).toBe(200);
    const note = await res.json() as { body: string };
    expect(note.body).toBe(updated);
  });

  test('non-author update → 403', async ({ browser }) => {
    const ts = String(Date.now() + 3);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    await loginAs(ctx1.request, ts + 'a');
    await loginAs(ctx2.request, ts + 'b');
    const { id } = await (await ctx1.request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } })).json() as { id: string };
    const res = await ctx2.request.put(`${BASE}/api/notes/${id}`, { data: { body: 'Hijacked note content here.' } });
    expect(res.status()).toBe(403);
    await ctx1.close(); await ctx2.close();
  });
});

test.describe('DELETE /api/notes/:id (private)', () => {
  test('author can delete (hard delete)', async ({ request }) => {
    const ts = String(Date.now() + 4);
    await loginAs(request, ts);
    const { id } = await (await request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } })).json() as { id: string };
    const res = await request.delete(`${BASE}/api/notes/${id}`);
    expect(res.status()).toBe(200);
    const list = await (await request.get(`${BASE}/api/notes`)).json() as unknown[];
    expect(list.length).toBe(0);
  });

  test('non-author delete → 403', async ({ browser }) => {
    const ts = String(Date.now() + 5);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    await loginAs(ctx1.request, ts + 'a');
    await loginAs(ctx2.request, ts + 'b');
    const { id } = await (await ctx1.request.post(`${BASE}/api/notes`, { data: { body: BODY, visibility: 'private' } })).json() as { id: string };
    const res = await ctx2.request.delete(`${BASE}/api/notes/${id}`);
    expect(res.status()).toBe(403);
    await ctx1.close(); await ctx2.close();
  });
});
