// Acceptance Test
// Traces to: T-041
// Description: Spouse-shared notes CRUD — both spouses read; author mutates; 409 for solo users.

import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function loginAs(request: import('@playwright/test').APIRequestContext, suffix: string): Promise<string> {
  const email = `snote-${suffix}@example.com`;
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

const BODY = 'Shared note about our counsellor session that we both want to keep.';

test.describe('POST /api/notes (spouse)', () => {
  test('creates spouse note → 201', async ({ browser }) => {
    const ts = String(Date.now());
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const email2 = await loginAs(ctx2.request, ts + 'b');
    await loginAs(ctx1.request, ts + 'a');
    await coupleUp(ctx1.request, ctx2.request, email2);
    const res = await ctx1.request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: BODY } });
    expect(res.status()).toBe(201);
    const note = await res.json() as { id: string; visibility: string };
    expect(note.id).toBeTruthy();
    expect(note.visibility).toBe('spouse');
    await ctx1.close(); await ctx2.close();
  });

  test('solo user (no couple) → 409', async ({ request }) => {
    const ts = String(Date.now() + 1);
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: BODY } });
    expect(res.status()).toBe(409);
  });
});

test.describe('GET /api/notes?visibility=spouse', () => {
  test('both spouses see the note', async ({ browser }) => {
    const ts = String(Date.now() + 2);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const email2 = await loginAs(ctx2.request, ts + 'b');
    await loginAs(ctx1.request, ts + 'a');
    await coupleUp(ctx1.request, ctx2.request, email2);
    await ctx1.request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: BODY } });
    const list1 = await (await ctx1.request.get(`${BASE}/api/notes?visibility=spouse`)).json() as { body: string }[];
    const list2 = await (await ctx2.request.get(`${BASE}/api/notes?visibility=spouse`)).json() as { body: string }[];
    expect(list1.length).toBe(1);
    expect(list2.length).toBe(1);
    expect(list1[0].body).toBe(BODY);
    await ctx1.close(); await ctx2.close();
  });

  test('third party cannot see spouse notes', async ({ browser }) => {
    const ts = String(Date.now() + 3);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const email2 = await loginAs(ctx2.request, ts + 'b');
    await loginAs(ctx1.request, ts + 'a');
    await loginAs(ctx3.request, ts + 'c');
    await coupleUp(ctx1.request, ctx2.request, email2);
    await ctx1.request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: BODY } });
    const list3 = await (await ctx3.request.get(`${BASE}/api/notes?visibility=spouse`)).json() as unknown[];
    expect(list3.length).toBe(0);
    await ctx1.close(); await ctx2.close(); await ctx3.close();
  });
});

test.describe('PUT /api/notes/:id (spouse)', () => {
  test('non-author spouse cannot update', async ({ browser }) => {
    const ts = String(Date.now() + 4);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const email2 = await loginAs(ctx2.request, ts + 'b');
    await loginAs(ctx1.request, ts + 'a');
    await coupleUp(ctx1.request, ctx2.request, email2);
    const { id } = await (await ctx1.request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: BODY } })).json() as { id: string };
    const res = await ctx2.request.put(`${BASE}/api/notes/${id}`, { data: { body: 'Trying to overwrite this note here.' } });
    expect(res.status()).toBe(403);
    await ctx1.close(); await ctx2.close();
  });
});

test.describe('After unlink', () => {
  test('former spouse no longer sees spouse notes', async ({ browser }) => {
    const ts = String(Date.now() + 5);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const email2 = await loginAs(ctx2.request, ts + 'b');
    await loginAs(ctx1.request, ts + 'a');
    await coupleUp(ctx1.request, ctx2.request, email2);
    await ctx1.request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: BODY } });
    await ctx1.request.post(`${BASE}/api/couple/unlink`);
    const list2 = await (await ctx2.request.get(`${BASE}/api/notes?visibility=spouse`)).json() as unknown[];
    expect(list2.length).toBe(0);
    await ctx1.close(); await ctx2.close();
  });
});
