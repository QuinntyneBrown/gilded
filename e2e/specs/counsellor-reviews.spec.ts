// Acceptance Test
// Traces to: T-031
// Description: POST/GET/DELETE /api/counsellors/:id/reviews and DELETE /api/reviews/:id.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const SEED = `${BASE}/api/dev/seed/counsellor`;

async function seedCounsellor(request: APIRequestContext, ts: string): Promise<string> {
  const r = await request.post(SEED, {
    data: { name: `Review Dr. ${ts}`, denomination: 'Test', credentials: [], specialties: [], address: 'Ottawa, ON', phone: `+1-613-${ts.slice(-7)}`, source: 'web_research', verified: true },
  });
  return ((await r.json()) as { id: string }).id;
}

async function loginAs(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `review-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

const VALID_BODY = 'This counsellor was very helpful and I would highly recommend them to anyone seeking faith-based therapy.';

test.describe('POST /api/counsellors/:id/reviews', () => {
  test('valid review (20-4000 chars) → 201', async ({ request }) => {
    const ts = String(Date.now());
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY } });
    expect(res.status()).toBe(201);
    const review = await res.json() as { id: string; body: string };
    expect(review.id).toBeTruthy();
    expect(review.body).toBe(VALID_BODY);
  });

  test('body < 20 chars → 400', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: 'Too short.' } });
    expect(res.status()).toBe(400);
  });

  test('body > 4000 chars → 400', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: 'x'.repeat(4001) } });
    expect(res.status()).toBe(400);
  });

  test('profane content → 422', async ({ request }) => {
    const ts = String(Date.now() + 3);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const res = await request.post(`${BASE}/api/counsellors/${id}/reviews`, {
      data: { body: 'This counsellor is total crap and I hate everything about this damn practice and all of that.' },
    });
    expect(res.status()).toBe(422);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const ts = String(Date.now() + 4);
    const id = await seedCounsellor(request, ts);
    const res = await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY } });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/counsellors/:id/reviews', () => {
  test('returns reviews ordered newest first', async ({ request }) => {
    const ts = String(Date.now() + 5);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY + ' first' } });
    await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY + ' second' } });
    const reviews = await (await request.get(`${BASE}/api/counsellors/${id}/reviews`)).json() as { body: string }[];
    expect(reviews.length).toBe(2);
    expect(reviews[0].body).toContain('second');
  });
});

test.describe('DELETE /api/reviews/:id', () => {
  test('author delete → body replaced with [removed by author]', async ({ request }) => {
    const ts = String(Date.now() + 6);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const { id: reviewId } = await (await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY } })).json() as { id: string };
    await request.delete(`${BASE}/api/reviews/${reviewId}`);
    const reviews = await (await request.get(`${BASE}/api/counsellors/${id}/reviews`)).json() as { body: string; authorId: string | null }[];
    expect(reviews[0].body).toBe('[removed by author]');
    expect(reviews[0].authorId).toBeNull();
  });

  test('non-author non-moderator delete → 403', async ({ request }) => {
    const ts = String(Date.now() + 7);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts + 'a');
    const { id: reviewId } = await (await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY } })).json() as { id: string };
    await loginAs(request, ts + 'b');
    const res = await request.delete(`${BASE}/api/reviews/${reviewId}`);
    expect(res.status()).toBe(403);
  });

  test('moderator delete → body replaced with [removed by moderator]', async ({ request }) => {
    const ts = String(Date.now() + 8);
    const id = await seedCounsellor(request, ts);
    await loginAs(request, ts + 'a');
    const { id: reviewId } = await (await request.post(`${BASE}/api/counsellors/${id}/reviews`, { data: { body: VALID_BODY } })).json() as { id: string };
    await loginAs(request, ts + 'b');
    await request.post(`${BASE}/api/dev/grant-role`, { data: { email: `review-${ts}b@example.com`, role: 'moderator' } });
    await request.post(`${BASE}/api/auth/login`, { data: { email: `review-${ts}b@example.com`, password: 'Password1!' } });
    await request.delete(`${BASE}/api/reviews/${reviewId}`);
    const reviews = await (await request.get(`${BASE}/api/counsellors/${id}/reviews`)).json() as { body: string }[];
    expect(reviews[0].body).toBe('[removed by moderator]');
  });
});
