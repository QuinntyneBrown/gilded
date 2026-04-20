// Acceptance Test
// Traces to: T-025
// Description: Seeded counsellors without a photo render the placeholder avatar on the profile page.

import { expect, test } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SEED = `${BASE}/api/dev/seed/counsellor`;

const SEED_RECORDS = [
  {
    name: 'Jen Bondoc',
    denomination: 'Christian (Non-denominational)',
    credentials: ['Registered Psychotherapist', 'MA', 'BEd'],
    specialties: ['Faith-integrated therapy'],
    address: 'Mississauga, ON',
    phone: '(289) 276-6915',
    source: 'web_research',
    verified: false,
    sourceUrl: 'https://www.psychologytoday.com/ca/therapists/jen-bondoc-mississauga-on/1003789',
  },
  {
    name: 'Sabrina Giscômbe',
    denomination: 'Christian (Non-denominational)',
    credentials: ['Registered Social Worker', 'MSW', 'RSW'],
    specialties: ['Faith-integrated therapy'],
    address: 'Mississauga, ON',
    phone: '(249) 802-8413',
    source: 'web_research',
    verified: false,
    sourceUrl: 'https://www.psychologytoday.com/ca/therapists/sabrina-giscombe-mississauga-on/1515068',
  },
];

test.describe('seeded counsellors', () => {
  test('profile without photo renders placeholder avatar', async ({ page, request }) => {
    const ts = Date.now();
    const record = { ...SEED_RECORDS[0], email: `seed-avatar-${ts}@example.com` };
    const { id } = await (await request.post(SEED, { data: record })).json() as { id: string };

    await page.goto(`/counsellors/${id}`);
    await expect(page.locator('app-counsellor-avatar')).toBeVisible({ timeout: 10_000 });
  });

  test('second POST with same sourceUrl returns existing id', async ({ request }) => {
    const ts = Date.now() + 1;
    const record = { ...SEED_RECORDS[1], email: `seed-idem-${ts}@example.com` };

    const r1 = await request.post(SEED, { data: record });
    const { id: id1 } = await r1.json() as { id: string };

    const r2 = await request.post(SEED, { data: { ...record, email: `seed-idem-dup-${ts}@example.com`, sourceUrl: record.sourceUrl } });
    const { id: id2 } = await r2.json() as { id: string };

    expect(id2).toBe(id1);
  });
});
