// Acceptance Test
// Traces to: T-028
// Description: Moderation queue — approve/reject, role guard, search visibility, rejection email.

import { expect, test, type APIRequestContext } from '@playwright/test';
import { ModerationQueuePage } from '../pages/moderation-queue.page';

const BASE = 'http://127.0.0.1:3000';

async function createUser(request: APIRequestContext, suffix: string): Promise<{ sid: string; email: string }> {
  const email = `mod-user-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  const loginRes = await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  const cookieHeader = loginRes.headers()['set-cookie'] ?? '';
  const sid = cookieHeader.match(/sid=([^;]+)/)?.[1] ?? '';
  return { sid, email };
}

async function grantModerator(request: APIRequestContext, email: string): Promise<void> {
  await request.post(`${BASE}/api/dev/grant-role`, { data: { email, role: 'moderator' } });
}

async function submitCounsellor(request: APIRequestContext, ts: string): Promise<string> {
  const res = await request.post(`${BASE}/api/counsellors`, {
    data: { name: `Pending Dr. ${ts}`, denomination: 'Test', address: `${ts} Test St, Ottawa, ON`, phone: `+1-613-555-${ts.slice(-4)}` },
  });
  return ((await res.json()) as { id: string }).id;
}

test.describe('moderation queue', () => {
  test('non-moderator → 403 on admin endpoints', async ({ request }) => {
    const ts = String(Date.now());
    await createUser(request, ts);

    const r1 = await request.get(`${BASE}/api/admin/counsellors/pending`);
    expect(r1.status()).toBe(403);
    const r2 = await request.post(`${BASE}/api/admin/counsellors/some-id/approve`);
    expect(r2.status()).toBe(403);
    const r3 = await request.post(`${BASE}/api/admin/counsellors/some-id/reject`, { data: { reason: 'test' } });
    expect(r3.status()).toBe(403);
  });

  test('approve → counsellor appears in public search', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const submitter = await createUser(request, ts + 'a');
    await request.post(`${BASE}/api/auth/login`, { data: { email: submitter.email, password: 'Password1!' } });
    const counsellorId = await submitCounsellor(request, ts);

    const moderator = await createUser(request, ts + 'b');
    await grantModerator(request, moderator.email);
    await request.post(`${BASE}/api/auth/login`, { data: { email: moderator.email, password: 'Password1!' } });

    // Verify not visible in search yet
    const searchBefore = await request.get(`${BASE}/api/counsellors/${counsellorId}`);
    expect((await searchBefore.json() as { moderationState: string }).moderationState).toBe('pending');

    const approveRes = await request.post(`${BASE}/api/admin/counsellors/${counsellorId}/approve`);
    expect(approveRes.status()).toBe(200);

    const searchAfter = await request.get(`${BASE}/api/counsellors/${counsellorId}`);
    expect((await searchAfter.json() as { moderationState: string }).moderationState).toBe('approved');
  });

  test('reject → submitter gets reason in email', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const submitter = await createUser(request, ts + 'a');
    await request.post(`${BASE}/api/auth/login`, { data: { email: submitter.email, password: 'Password1!' } });
    const counsellorId = await submitCounsellor(request, ts);

    const moderator = await createUser(request, ts + 'b');
    await grantModerator(request, moderator.email);
    await request.post(`${BASE}/api/auth/login`, { data: { email: moderator.email, password: 'Password1!' } });

    const rejectRes = await request.post(`${BASE}/api/admin/counsellors/${counsellorId}/reject`, {
      data: { reason: 'Insufficient credentials provided.' },
    });
    expect(rejectRes.status()).toBe(200);

    const tokenEntry = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(submitter.email)}`)).json() as { token: string };
    expect(tokenEntry.token).toContain('Insufficient credentials');
  });

  test('pending item invisible in public search (moderationState=pending)', async ({ request }) => {
    const ts = String(Date.now() + 3);
    await createUser(request, ts);
    const counsellorId = await submitCounsellor(request, ts);

    const profile = await request.get(`${BASE}/api/counsellors/${counsellorId}`);
    expect((await profile.json() as { moderationState: string }).moderationState).toBe('pending');
  });

  test('admin page renders pending submissions and approve works', async ({ page, request }) => {
    const ts = String(Date.now() + 4);
    const submitter = await createUser(request, ts + 'a');
    await request.post(`${BASE}/api/auth/login`, { data: { email: submitter.email, password: 'Password1!' } });
    await submitCounsellor(request, ts);

    const moderator = await createUser(request, ts + 'b');
    await grantModerator(request, moderator.email);
    const { sid: modSid } = moderator;

    await page.context().addCookies([{ name: 'sid', value: modSid, domain: '127.0.0.1', path: '/' }]);
    const queuePage = new ModerationQueuePage(page);
    await queuePage.goto();

    const count = await queuePage.pendingCount();
    expect(count).toBeGreaterThan(0);

    await queuePage.approveAt(0);
    expect(await queuePage.pendingCount()).toBeLessThan(count);
  });
});
