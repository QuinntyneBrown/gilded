// Acceptance Test
// Traces to: T-032
// Description: POST/GET/DELETE /api/reviews/:reviewId/comments and DELETE /api/comments/:id.

import { expect, test, type APIRequestContext } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const SEED = `${BASE}/api/dev/seed/counsellor`;

async function seedCounsellor(request: APIRequestContext, ts: string): Promise<string> {
  const r = await request.post(SEED, {
    data: { name: `Comment Dr. ${ts}`, denomination: 'Test', credentials: [], specialties: [], address: 'Toronto, ON', phone: `+1-416-${ts.slice(-7)}`, source: 'web_research', verified: true },
  });
  return ((await r.json()) as { id: string }).id;
}

async function loginAs(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `comment-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

const VALID_REVIEW = 'This counsellor was very helpful and I would highly recommend them to anyone seeking faith-based therapy.';
const VALID_COMMENT = 'Thank you for sharing your experience with this counsellor.';

async function seedReview(request: APIRequestContext, counsellorId: string): Promise<string> {
  const res = await request.post(`${BASE}/api/counsellors/${counsellorId}/reviews`, { data: { body: VALID_REVIEW } });
  return ((await res.json()) as { id: string }).id;
}

test.describe('POST /api/reviews/:reviewId/comments', () => {
  test('valid comment (1-1000 chars) → 201', async ({ request }) => {
    const ts = String(Date.now());
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    const res = await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: VALID_COMMENT } });
    expect(res.status()).toBe(201);
    const comment = await res.json() as { id: string; body: string; reviewId: string };
    expect(comment.id).toBeTruthy();
    expect(comment.body).toBe(VALID_COMMENT);
    expect(comment.reviewId).toBe(reviewId);
  });

  test('body empty → 400', async ({ request }) => {
    const ts = String(Date.now() + 1);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    const res = await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: '' } });
    expect(res.status()).toBe(400);
  });

  test('body > 1000 chars → 400', async ({ request }) => {
    const ts = String(Date.now() + 2);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    const res = await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: 'x'.repeat(1001) } });
    expect(res.status()).toBe(400);
  });

  test('profane content → 422', async ({ request }) => {
    const ts = String(Date.now() + 3);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    const res = await request.post(`${BASE}/api/reviews/${reviewId}/comments`, {
      data: { body: 'This is total crap and I hate this damn counsellor so much.' },
    });
    expect(res.status()).toBe(422);
  });

  test('unauthenticated → 401', async ({ request }) => {
    const ts = String(Date.now() + 4);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    const freshCtx = request;
    // New request context without cookies would be ideal but using same context after logout
    await request.post(`${BASE}/api/auth/logout`);
    const res = await freshCtx.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: VALID_COMMENT } });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/reviews/:reviewId/comments', () => {
  test('returns comments ordered newest first', async ({ request }) => {
    const ts = String(Date.now() + 5);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: 'First comment here, thank you.' } });
    await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: 'Second comment here, much appreciated.' } });
    const comments = await (await request.get(`${BASE}/api/reviews/${reviewId}/comments`)).json() as { body: string }[];
    expect(comments.length).toBe(2);
    expect(comments[0].body).toContain('Second');
  });
});

test.describe('DELETE /api/comments/:id', () => {
  test('author delete → body replaced with [removed by author]', async ({ request }) => {
    const ts = String(Date.now() + 6);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts);
    const reviewId = await seedReview(request, cid);
    const { id: commentId } = await (await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: VALID_COMMENT } })).json() as { id: string };
    await request.delete(`${BASE}/api/comments/${commentId}`);
    const comments = await (await request.get(`${BASE}/api/reviews/${reviewId}/comments`)).json() as { body: string; authorId: string | null }[];
    expect(comments[0].body).toBe('[removed by author]');
    expect(comments[0].authorId).toBeNull();
  });

  test('non-author non-moderator delete → 403', async ({ request }) => {
    const ts = String(Date.now() + 7);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts + 'a');
    const reviewId = await seedReview(request, cid);
    const { id: commentId } = await (await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: VALID_COMMENT } })).json() as { id: string };
    await loginAs(request, ts + 'b');
    const res = await request.delete(`${BASE}/api/comments/${commentId}`);
    expect(res.status()).toBe(403);
  });

  test('moderator delete → body replaced with [removed by moderator]', async ({ request }) => {
    const ts = String(Date.now() + 8);
    const cid = await seedCounsellor(request, ts);
    await loginAs(request, ts + 'a');
    const reviewId = await seedReview(request, cid);
    const { id: commentId } = await (await request.post(`${BASE}/api/reviews/${reviewId}/comments`, { data: { body: VALID_COMMENT } })).json() as { id: string };
    await loginAs(request, ts + 'b');
    await request.post(`${BASE}/api/dev/grant-role`, { data: { email: `comment-${ts}b@example.com`, role: 'moderator' } });
    await request.post(`${BASE}/api/auth/login`, { data: { email: `comment-${ts}b@example.com`, password: 'Password1!' } });
    await request.delete(`${BASE}/api/comments/${commentId}`);
    const comments = await (await request.get(`${BASE}/api/reviews/${reviewId}/comments`)).json() as { body: string }[];
    expect(comments[0].body).toBe('[removed by moderator]');
  });
});
