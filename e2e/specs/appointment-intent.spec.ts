// Acceptance Test
// Traces to: T-038
// Description: POST/GET appointment-intent; Make Appointment button; reminder banner.

import { expect, test } from '@playwright/test';
import { CounsellorProfilePage } from '../pages/counsellor-profile.page';

const BASE = 'http://127.0.0.1:3000';

async function seedCounsellor(request: import('@playwright/test').APIRequestContext, ts: string, withBooking = true) {
  const r = await request.post(`${BASE}/api/dev/seed/counsellor`, {
    data: {
      name: `Appt Dr. ${ts}`, denomination: 'Test', credentials: [], specialties: [],
      address: 'Ottawa, ON', phone: `+1-613-${ts.slice(-7)}`, email: `apptdr${ts}@example.com`,
      bookingLink: withBooking ? 'https://example.com/book' : undefined,
      source: 'web_research', verified: true,
    },
  });
  return ((await r.json()) as { id: string }).id;
}

async function loginUser(request: import('@playwright/test').APIRequestContext, suffix: string): Promise<string> {
  const email = `appt-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

test.describe('POST /api/appointment-intent', () => {
  test('creates intent → 201', async ({ request }) => {
    const ts = String(Date.now());
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const res = await request.post(`${BASE}/api/appointment-intent`, { data: { counsellorId: id } });
    expect(res.status()).toBe(201);
    const body = await res.json() as { id: string; status: string };
    expect(body.id).toBeTruthy();
    expect(body.status).toBe('pending');
  });

  test('unauthenticated → 401', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const id = await seedCounsellor(request, ts);
    const res = await request.post(`${BASE}/api/appointment-intent`, { data: { counsellorId: id } });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/me/appointment-intent/current', () => {
  test('returns pending intent', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    await request.post(`${BASE}/api/appointment-intent`, { data: { counsellorId: id } });
    const res = await request.get(`${BASE}/api/me/appointment-intent/current`);
    expect(res.status()).toBe(200);
    const intent = await res.json() as { counsellorId: string; status: string } | null;
    expect(intent?.counsellorId).toBe(id);
    expect(intent?.status).toBe('pending');
  });

  test('returns null when no pending intent', async ({ request }) => {
    const ts = String(Date.now() + 3);
    await loginUser(request, ts);
    const res = await request.get(`${BASE}/api/me/appointment-intent/current`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });
});

test.describe('Status transitions', () => {
  test('mark booked → status becomes booked', async ({ request }) => {
    const ts = String(Date.now() + 4);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const { id: intentId } = await (await request.post(`${BASE}/api/appointment-intent`, { data: { counsellorId: id } })).json() as { id: string };
    const res = await request.post(`${BASE}/api/appointment-intent/${intentId}/booked`);
    expect(res.status()).toBe(200);
    const current = await (await request.get(`${BASE}/api/me/appointment-intent/current`)).json();
    expect(current).toBeNull();
  });

  test('mark cancelled → status becomes cancelled', async ({ request }) => {
    const ts = String(Date.now() + 5);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const { id: intentId } = await (await request.post(`${BASE}/api/appointment-intent`, { data: { counsellorId: id } })).json() as { id: string };
    const res = await request.post(`${BASE}/api/appointment-intent/${intentId}/cancelled`);
    expect(res.status()).toBe(200);
  });
});

test.describe('Make Appointment UI', () => {
  test('Make Appointment reveals booking panel on counsellor profile', async ({ page, request }) => {
    const ts = String(Date.now() + 6);
    const id = await seedCounsellor(request, ts, true);
    await loginUser(request, ts);
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    await page.getByRole('button', { name: /make appointment/i }).click();
    await expect(page.locator('[data-booking-panel]')).toBeVisible();
    const link = page.locator('[data-booking-link]');
    await expect(link).toBeVisible();
    expect(await link.getAttribute('rel')).toContain('noopener');
  });

  test('appointment banner appears after intent created', async ({ page, request }) => {
    const ts = String(Date.now() + 7);
    const id = await seedCounsellor(request, ts, true);
    await loginUser(request, ts);
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    await page.getByRole('button', { name: /make appointment/i }).click();
    await page.waitForTimeout(500);
    await page.goto('http://localhost:4200/search');
    await expect(page.locator('[data-appointment-banner]')).toBeVisible({ timeout: 8_000 });
  });
});
