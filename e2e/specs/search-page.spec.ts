// Acceptance Test
// Traces to: T-022
// Description: Search page shows results with distance; pagination; radius change; invalid postal MatError; empty state.

import { expect, test } from '@playwright/test';
import { SearchPage } from '../pages/search.page';

const BASE = 'http://127.0.0.1:3000';
const SEED_COUNSELLOR = `${BASE}/api/dev/seed/counsellor`;
const SEED_POSTAL = `${BASE}/api/dev/seed/postal`;

const CENTER_LAT = 43.55;
const CENTER_LNG = -79.62;
const KM_PER_DEG = 111.19;

type ApiRequest = Parameters<Parameters<typeof test>[1]>[0]['request'];

async function seedSearchData(request: ApiRequest, ts: number): Promise<void> {
  await request.post(SEED_POSTAL, { data: { code: 'L5A4E6', lat: CENTER_LAT, lng: CENTER_LNG } });
  for (let i = 0; i < 22; i++) {
    await request.post(SEED_COUNSELLOR, {
      data: {
        name: `Counsellor ${i} (${ts})`,
        denomination: 'Non-denominational',
        credentials: ['BCC'],
        specialties: ['anxiety'],
        address: `${i} Test St, Mississauga`,
        phone: `+1-905-${String(ts).slice(-4)}-${String(i).padStart(4, '0')}`,
        email: `c${i}-${ts}@example.com`,
        source: 'web_research',
        verified: true,
        lat: CENTER_LAT + i / KM_PER_DEG,
        lng: CENTER_LNG,
      },
    });
  }
}

test.describe('Search page', () => {
  test('search shows results with ascending distance', async ({ page, request }) => {
    const ts = Date.now();
    await seedSearchData(request, ts);

    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.search('L5A4E6', 25);

    const results = await searchPage.results();
    expect(results.length).toBe(20);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distanceKm).toBeGreaterThanOrEqual(results[i - 1].distanceKm);
    }
  });

  test('page 2 shows remaining results', async ({ page, request }) => {
    const ts = Date.now() + 1;
    await seedSearchData(request, ts);

    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.search('L5A4E6', 25);
    await searchPage.gotoPage(2);

    const results = await searchPage.results();
    expect(results.length).toBe(2);
  });

  test('smaller radius returns fewer results', async ({ page, request }) => {
    const ts = Date.now() + 2;
    await seedSearchData(request, ts);

    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.search('L5A4E6', 10);

    const results = await searchPage.results();
    for (const r of results) {
      expect(r.distanceKm).toBeLessThanOrEqual(10);
    }
  });

  test('invalid postal shows MatError', async ({ page }) => {
    await page.route('**/api/counsellors**', route => {
      route.fulfill({ status: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid postal code.' }) });
    });

    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.search('BADCODE');
    await searchPage.expectPostalError();
  });

  test('empty results shows empty state message', async ({ page }) => {
    await page.route('**/api/counsellors**', route => {
      route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) });
    });

    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.search('L5A4E6', 25);
    await searchPage.expectEmptyState();
  });
});
