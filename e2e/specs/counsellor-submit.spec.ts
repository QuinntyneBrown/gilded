// Acceptance Test
// Traces to: T-027
// Description: POST /api/counsellors — auth-required submission with dedup and field validation.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function loginAs(request: APIRequestContext, suffix: string): Promise<void> {
  const email = `submit-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
}

const VALID_BODY = {
  name: 'Dr. Test Counsellor',
  denomination: 'Christian (Non-denominational)',
  credentials: ['PhD'],
  specialties: ['Anxiety'],
  address: '123 Main St, Ottawa, ON',
  phone: '+1-613-555-7001',
};

test.describe('POST /api/counsellors', () => {
  test('valid submission → 201, source=user_submitted, moderationState=pending', async ({ request }) => {
    const ts = String(Date.now());
    await loginAs(request, ts);

    const res = await request.post(`${BASE}/api/counsellors`, { data: { ...VALID_BODY, phone: `+1-613-555-${ts.slice(-4)}` } });
    expect(res.status()).toBe(201);
    const body = await res.json() as { id: string };
    expect(body.id).toBeTruthy();

    const profile = await (await request.get(`${BASE}/api/counsellors/${body.id}`)).json() as { source: string; verified: boolean; moderationState: string };
    expect(profile.source).toBe('user_submitted');
    expect(profile.verified).toBe(false);
    expect(profile.moderationState).toBe('pending');
  });

  test('duplicate by phone → 409 with existingId', async ({ request }) => {
    const ts = String(Date.now() + 1);
    await loginAs(request, ts);

    const phone = `+1-613-555-${ts.slice(-4)}`;
    const r1 = await request.post(`${BASE}/api/counsellors`, { data: { ...VALID_BODY, phone } });
    expect(r1.status()).toBe(201);
    const { id: existingId } = await r1.json() as { id: string };

    const r2 = await request.post(`${BASE}/api/counsellors`, { data: { ...VALID_BODY, name: 'Different Name', phone } });
    expect(r2.status()).toBe(409);
    const err = await r2.json() as { existingId: string };
    expect(err.existingId).toBe(existingId);
  });

  test('missing denomination → 400', async ({ request }) => {
    const ts = String(Date.now() + 2);
    await loginAs(request, ts);

    const res = await request.post(`${BASE}/api/counsellors`, {
      data: { name: VALID_BODY.name, credentials: VALID_BODY.credentials, specialties: VALID_BODY.specialties, address: VALID_BODY.address, phone: VALID_BODY.phone },
    });
    expect(res.status()).toBe(400);
  });

  test('missing contact method (no phone, no email) → 400', async ({ request }) => {
    const ts = String(Date.now() + 3);
    await loginAs(request, ts);

    const res = await request.post(`${BASE}/api/counsellors`, {
      data: { name: VALID_BODY.name, denomination: VALID_BODY.denomination, credentials: VALID_BODY.credentials, specialties: VALID_BODY.specialties, address: VALID_BODY.address },
    });
    expect(res.status()).toBe(400);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/counsellors`, { data: VALID_BODY });
    expect(res.status()).toBe(401);
  });
});
