// Acceptance Test
// Traces to: T-019
// Description: GET /api/counsellors/:id returns full profile; unknown id → 404; zero reviews → rating null.

import { expect, test } from '@playwright/test';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SEED = `${BASE}/api/dev/seed/counsellor`;
const GET = (id: string) => `${BASE}/api/counsellors/${id}`;

const COUNSELLOR = {
  name: 'Dr. Alice Smith',
  denomination: 'Non-denominational',
  credentials: ['MSc', 'Registered Counsellor'],
  specialties: ['marriage', 'family'],
  address: '100 Church St, Ottawa, ON K1A 0A1',
  phone: '+1-613-555-0100',
  email: `alice-${Date.now()}@example.com`,
  website: 'https://alice-counselling.example.com',
  bookingLink: 'https://booking.example.com/alice',
  source: 'web_research',
  verified: true,
};

test.describe('GET /api/counsellors/:id', () => {
  test('returns full counsellor profile', async ({ request }) => {
    const { id } = await (await request.post(SEED, { data: COUNSELLOR })).json() as { id: string };
    const res = await request.get(GET(id));
    expect(res.status()).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['id']).toBe(id);
    expect(body['name']).toBe(COUNSELLOR.name);
    expect(body['denomination']).toBe(COUNSELLOR.denomination);
    expect(body['credentials']).toEqual(COUNSELLOR.credentials);
    expect(body['specialties']).toEqual(COUNSELLOR.specialties);
    expect(body['address']).toBe(COUNSELLOR.address);
    expect(body['phone']).toBe(COUNSELLOR.phone);
    expect(body['email']).toBe(COUNSELLOR.email);
    expect(body['website']).toBe(COUNSELLOR.website);
    expect(body['bookingLink']).toBe(COUNSELLOR.bookingLink);
    expect(body['source']).toBe(COUNSELLOR.source);
    expect(body['verified']).toBe(COUNSELLOR.verified);
  });

  test('zero reviews → rating: null, reviewCount: 0', async ({ request }) => {
    const { id } = await (await request.post(SEED, { data: COUNSELLOR })).json() as { id: string };
    const body = await (await request.get(GET(id))).json() as Record<string, unknown>;
    expect(body['rating']).toBeNull();
    expect(body['reviewCount']).toBe(0);
  });

  test('unknown id → 404', async ({ request }) => {
    const res = await request.get(GET('00000000-0000-0000-0000-000000000000'));
    expect(res.status()).toBe(404);
  });
});
