// Acceptance Test
// Traces to: T-043
// Description: IDOR probes for notes endpoints — cross-user and cross-couple access must be denied.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';

async function registerAndLogin(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `idor-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

async function coupleUp(r1: APIRequestContext, r2: APIRequestContext, email2: string): Promise<void> {
  await r1.post(`${BASE}/api/couple/invite`, { data: { email: email2 } });
  const { token } = await (await r1.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email2)}`)).json() as { token: string };
  await r2.post(`${BASE}/api/couple/accept`, { data: { token } });
}

const PRIVATE_BODY = 'Private counselling reflection for my eyes only.';
const SPOUSE_BODY = 'Shared counselling note for our journey together.';

test.describe('IDOR: private notes', () => {
  test('cross-user GET private note → 403', async ({ browser }) => {
    const ts = String(Date.now());
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await registerAndLogin(ctxA.request, ts + 'a');
    await registerAndLogin(ctxB.request, ts + 'b');
    const { id } = await (await ctxA.request.post(`${BASE}/api/notes`, { data: { body: PRIVATE_BODY } })).json() as { id: string };
    const res = await ctxB.request.get(`${BASE}/api/notes/${id}`);
    expect(res.status()).toBe(403);
    await ctxA.close(); await ctxB.close();
  });

  test('cross-user PUT private note → 403', async ({ browser }) => {
    const ts = String(Date.now() + 1);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await registerAndLogin(ctxA.request, ts + 'a');
    await registerAndLogin(ctxB.request, ts + 'b');
    const { id } = await (await ctxA.request.post(`${BASE}/api/notes`, { data: { body: PRIVATE_BODY } })).json() as { id: string };
    const res = await ctxB.request.put(`${BASE}/api/notes/${id}`, { data: { body: 'Overwrite attempt here now.' } });
    expect(res.status()).toBe(403);
    await ctxA.close(); await ctxB.close();
  });

  test('admin GET foreign private note → 403', async ({ browser }) => {
    const ts = String(Date.now() + 2);
    const ctxA = await browser.newContext();
    const ctxAdmin = await browser.newContext();
    await registerAndLogin(ctxA.request, ts + 'a');
    const adminEmail = await registerAndLogin(ctxAdmin.request, ts + 'admin');
    await ctxAdmin.request.post(`${BASE}/api/dev/grant-role`, { data: { email: adminEmail, role: 'admin' } });
    const { id } = await (await ctxA.request.post(`${BASE}/api/notes`, { data: { body: PRIVATE_BODY } })).json() as { id: string };
    const res = await ctxAdmin.request.get(`${BASE}/api/notes/${id}`);
    expect(res.status()).toBe(403);
    await ctxA.close(); await ctxAdmin.close();
  });

  test('visibility=public param on private-note id → 403', async ({ browser }) => {
    const ts = String(Date.now() + 3);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await registerAndLogin(ctxA.request, ts + 'a');
    await registerAndLogin(ctxB.request, ts + 'b');
    const { id } = await (await ctxA.request.post(`${BASE}/api/notes`, { data: { body: PRIVATE_BODY } })).json() as { id: string };
    const res = await ctxB.request.get(`${BASE}/api/notes/${id}?visibility=public`);
    expect(res.status()).toBe(403);
    await ctxA.close(); await ctxB.close();
  });

  test('GET /api/notes returns only caller\'s own notes', async ({ browser }) => {
    const ts = String(Date.now() + 4);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await registerAndLogin(ctxA.request, ts + 'a');
    await registerAndLogin(ctxB.request, ts + 'b');
    await ctxA.request.post(`${BASE}/api/notes`, { data: { body: PRIVATE_BODY } });
    const list = await (await ctxB.request.get(`${BASE}/api/notes`)).json() as unknown[];
    expect(list.length).toBe(0);
    await ctxA.close(); await ctxB.close();
  });
});

test.describe('IDOR: spouse notes', () => {
  test('non-couple user GET spouse note → 403', async ({ browser }) => {
    const ts = String(Date.now() + 5);
    const ctxA = await browser.newContext();
    const ctxC = await browser.newContext();
    const ctxD = await browser.newContext();
    const emailC = await registerAndLogin(ctxC.request, ts + 'c');
    await registerAndLogin(ctxA.request, ts + 'a');
    await registerAndLogin(ctxD.request, ts + 'd');
    await coupleUp(ctxA.request, ctxC.request, emailC);
    const { id } = await (await ctxA.request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: SPOUSE_BODY } })).json() as { id: string };
    const res = await ctxD.request.get(`${BASE}/api/notes/${id}`);
    expect(res.status()).toBe(403);
    await ctxA.close(); await ctxC.close(); await ctxD.close();
  });

  test('solo user POST spouse note → 409', async ({ request }) => {
    const ts = String(Date.now() + 6);
    await registerAndLogin(request, ts + 'solo');
    const res = await request.post(`${BASE}/api/notes?visibility=spouse`, { data: { body: SPOUSE_BODY } });
    expect(res.status()).toBe(409);
  });
});
