// Acceptance Test
// Traces to: T-021
// Description: GET /api/counsellors?postal=...&radiusKm=25 returns ordered subset; pagination; default radius 25; invalid postal → 400.

import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const SEED_COUNSELLOR = `${BASE}/api/dev/seed/counsellor`;
const SEED_POSTAL = `${BASE}/api/dev/seed/postal`;
const SEARCH = `${BASE}/api/counsellors`;

const CENTER_LAT = 43.55;
const CENTER_LNG = -79.62;
const KM_PER_DEG = 111.19;

// 22 counsellors at 0-21 km north (within 25km), 3 at 30/40/50 km (outside)
const COUNSELLORS = [
  ...Array.from({ length: 22 }, (_, i) => ({
    name: `Near Counsellor ${i}`,
    denomination: 'Test',
    credentials: ['BCC'],
    specialties: ['anxiety'],
    address: `${i} Near St, Mississauga`,
    phone: `+1-905-555-${String(i).padStart(4, '0')}`,
    email: `near${i}-TIMESTAMP@example.com`,
    source: 'web_research',
    verified: true,
    lat: CENTER_LAT + i / KM_PER_DEG,
    lng: CENTER_LNG,
  })),
  ...([30, 40, 50] as const).map((dist, j) => ({
    name: `Far Counsellor ${j}`,
    denomination: 'Test',
    credentials: ['BCC'],
    specialties: ['anxiety'],
    address: `${j} Far St, Toronto`,
    phone: `+1-905-666-${String(j).padStart(4, '0')}`,
    email: `far${j}-TIMESTAMP@example.com`,
    source: 'web_research' as const,
    verified: true,
    lat: CENTER_LAT + dist / KM_PER_DEG,
    lng: CENTER_LNG,
  })),
];

type ApiRequest = Parameters<Parameters<typeof test>[1]>[0]['request'];

async function seedData(request: ApiRequest, ts: number): Promise<void> {
  await request.post(SEED_POSTAL, { data: { code: 'L5A4E6', lat: CENTER_LAT, lng: CENTER_LNG } });
  for (const c of COUNSELLORS) {
    await request.post(SEED_COUNSELLOR, {
      data: { ...c, email: c.email.replace('TIMESTAMP', String(ts)) },
    });
  }
}

test.describe('GET /api/counsellors proximity search', () => {
  test('returns 20 counsellors on page 1 ordered by distance', async ({ request }) => {
    const ts = Date.now();
    await seedData(request, ts);

    const res = await request.get(`${SEARCH}?postal=L5A4E6&radiusKm=25&page=1`);
    expect(res.status()).toBe(200);

    const { items, total } = await res.json() as { items: { distanceKm: number }[]; total: number };
    expect(items.length).toBe(20);
    expect(total).toBe(22);

    for (let i = 1; i < items.length; i++) {
      expect(items[i].distanceKm).toBeGreaterThanOrEqual(items[i - 1].distanceKm);
    }
    for (const item of items) {
      expect(item.distanceKm).toBeLessThanOrEqual(25);
    }
  });

  test('page 2 returns remaining 2 results', async ({ request }) => {
    const ts = Date.now() + 1;
    await seedData(request, ts);

    const { items, total } = await (await request.get(`${SEARCH}?postal=L5A4E6&radiusKm=25&page=2`)).json() as { items: unknown[]; total: number };
    expect(items.length).toBe(2);
    expect(total).toBe(22);
  });

  test('default radius is 25 km', async ({ request }) => {
    const ts = Date.now() + 2;
    await seedData(request, ts);

    const withDefault = await (await request.get(`${SEARCH}?postal=L5A4E6`)).json() as { total: number };
    const with25 = await (await request.get(`${SEARCH}?postal=L5A4E6&radiusKm=25`)).json() as { total: number };
    expect(withDefault.total).toBe(with25.total);
  });

  test('invalid postal → 400 without geocoding', async ({ request }) => {
    const res = await request.get(`${SEARCH}?postal=BADCODE`);
    expect(res.status()).toBe(400);
  });
});
