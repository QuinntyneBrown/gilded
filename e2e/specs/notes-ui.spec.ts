// Acceptance Test
// Traces to: T-044
// Description: Notes UI — three-visibility tabs; spouse disabled for solo user; public feed shows display name.

import { expect, test, type APIRequestContext } from '@playwright/test';
import { NotesPage } from '../pages/notes.page';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';

async function loginAs(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `nui-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

test.describe('Notes UI', () => {
  test('private tab: create note and see it listed', async ({ page, request }) => {
    const ts = String(Date.now());
    await loginAs(request, ts);
    const notesPage = new NotesPage(page);
    await notesPage.goto();
    await notesPage.openTab('private');
    await notesPage.createNote('My private counselling reflection here today.');
    const items = await notesPage.notes();
    expect(items.some(b => b.includes('My private counselling reflection here today.'))).toBe(true);
  });

  test('spouse tab is disabled for a solo user', async ({ page, request }) => {
    const ts = String(Date.now() + 1);
    await loginAs(request, ts);
    const notesPage = new NotesPage(page);
    await notesPage.goto();
    await notesPage.expectSpouseTabDisabled();
  });

  test('public tab: create note shows author display name', async ({ page, request }) => {
    const ts = String(Date.now() + 2);
    const email = await loginAs(request, ts);
    const notesPage = new NotesPage(page);
    await notesPage.goto();
    await notesPage.openTab('public');
    await notesPage.createNote('Grateful for our faith-based counselling journey together.');
    const displayName = email.split('@')[0];
    await expect(page.locator('[data-author-display]:visible').filter({ hasText: displayName }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('private note is not visible to a different user', async ({ browser }) => {
    const ts = String(Date.now() + 3);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await loginAs(ctxA.request, ts + 'a');
    await ctxA.request.post(`${BASE}/api/notes`, { data: { body: 'Secret note only for me here.' } });
    await loginAs(ctxB.request, ts + 'b');
    const pageB = await ctxB.newPage();
    const notesPage = new NotesPage(pageB);
    await notesPage.goto();
    const items = await notesPage.notes();
    expect(items.some(b => b.includes('Secret note only for me here.'))).toBe(false);
    await ctxA.close(); await ctxB.close();
  });
});
