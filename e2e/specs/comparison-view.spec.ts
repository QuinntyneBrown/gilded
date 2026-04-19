// Acceptance Test
// Traces to: T-036
// Description: Shortlist comparison view, desktop grid and mobile stacked cards.

import { expect, test } from '@playwright/test';
import { ShortlistPage } from '../pages/shortlist.page';

const BASE = 'http://127.0.0.1:3000';

async function setup(browserContext: import('@playwright/test').BrowserContext, ts: string) {
  const request = browserContext.request;

  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await request.post(`${BASE}/api/dev/seed/counsellor`, {
      data: { name: `Compare Dr. ${ts}-${i}`, denomination: 'Baptist', credentials: ['M.Div'], specialties: ['Marriage'], address: 'Ottawa, ON', phone: `+1-613-${(ts + i).slice(-7)}`, source: 'web_research', verified: true },
    });
    ids.push(((await r.json()) as { id: string }).id);
  }

  const email1 = `cmp-${ts}a@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email: email1, password: 'Password1!' } });
  const { token: tok1 } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email1)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${tok1}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email: email1, password: 'Password1!' } });

  for (const id of ids) await request.post(`${BASE}/api/shortlist/${id}`);

  return { email1, ids };
}

test.describe('Shortlist comparison view (desktop)', () => {
  test('shows 3 shortlisted counsellors in grid', async ({ browser }) => {
    const ts = String(Date.now());
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setup(ctx, ts);
    const page = ctx.page ?? (await ctx.newPage());
    const sl = new ShortlistPage(page);
    await sl.goto();
    const names = await sl.items();
    expect(names.length).toBe(3);
    await ctx.close();
  });
});

test.describe('Shortlist comparison view (mobile)', () => {
  test('shows stacked cards at 360px width', async ({ browser }) => {
    const ts = String(Date.now() + 1);
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
    await setup(ctx, ts);
    const page = await ctx.newPage();
    const sl = new ShortlistPage(page);
    await sl.goto();
    const items = await page.locator('[data-shortlist-item]').count();
    expect(items).toBe(3);
    await ctx.close();
  });
});

test.describe('Choose counsellor', () => {
  test('choose at index 0 → shows chosen indicator', async ({ browser }) => {
    const ts = String(Date.now() + 2);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setup(ctx, ts);
    const page = await ctx.newPage();
    const sl = new ShortlistPage(page);
    await sl.goto();
    await sl.chooseAt(0);
    await expect(page.locator('[data-shortlist-item]').first().locator('[data-chosen]')).toBeVisible();
    await ctx.close();
  });
});

test.describe('Remove from shortlist', () => {
  test('remove at index 1 → list has 2 items', async ({ browser }) => {
    const ts = String(Date.now() + 3);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setup(ctx, ts);
    const page = await ctx.newPage();
    const sl = new ShortlistPage(page);
    await sl.goto();
    await sl.removeAt(1);
    await page.waitForTimeout(500);
    const items = await sl.items();
    expect(items.length).toBe(2);
    await ctx.close();
  });
});
