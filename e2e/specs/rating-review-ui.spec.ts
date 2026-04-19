// Acceptance Test
// Traces to: T-034
// Description: Rating, review list with form, comment threads on counsellor profile.

import { expect, test, type APIRequestContext } from '@playwright/test';
import { CounsellorProfilePage } from '../pages/counsellor-profile.page';

const BASE = 'http://127.0.0.1:3000';

async function seedCounsellor(request: APIRequestContext, ts: string): Promise<string> {
  const r = await request.post(`${BASE}/api/dev/seed/counsellor`, {
    data: { name: `UI Dr. ${ts}`, denomination: 'Test', credentials: ['M.Div'], specialties: ['Anxiety'], address: 'Ottawa, ON', phone: `+1-613-${ts.slice(-7)}`, source: 'web_research', verified: true },
  });
  return ((await r.json()) as { id: string }).id;
}

async function loginUser(request: APIRequestContext, suffix: string): Promise<string> {
  const email = `ui-review-${suffix}@example.com`;
  await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
  const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
  await request.get(`${BASE}/api/auth/verify?token=${token}`);
  await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
  return email;
}

const LONG_REVIEW = 'A'.repeat(250) + ' faith-based counselling has helped our marriage significantly. ' + 'B'.repeat(180);

test.describe('Rating UI', () => {
  test('rate 4 stars → aggregate updates on page', async ({ page, request }) => {
    const ts = String(Date.now());
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    await profile.rate(4);
    await page.getByTestId('rating-display').waitFor({ timeout: 8_000 });
    const text = await page.getByTestId('rating-display').textContent();
    expect(text).toContain('4');
  });
});

test.describe('Review UI', () => {
  test('write 500-char review → appears at top of list', async ({ page, request }) => {
    const ts = String(Date.now() + 1);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    await profile.writeReview(LONG_REVIEW);
    const count = await profile.reviewCount();
    expect(count).toBe(1);
    await expect(page.locator('[data-review]').first()).toContainText(LONG_REVIEW.slice(0, 30));
  });

  test('author delete replaces review body text', async ({ page, request }) => {
    const ts = String(Date.now() + 2);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    await profile.writeReview(LONG_REVIEW);
    await profile.deleteOwnReviewAt(0);
    await expect(page.locator('[data-review]').first()).toContainText('[removed by author]');
  });
});

test.describe('Comment UI', () => {
  test('add 3 comments on a review → all visible in thread', async ({ page, request }) => {
    const ts = String(Date.now() + 3);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    await profile.writeReview(LONG_REVIEW);
    await profile.addCommentOnReviewAt(0, 'First reply to this review.');
    await profile.addCommentOnReviewAt(0, 'Second helpful comment here.');
    await profile.addCommentOnReviewAt(0, 'Third follow-up comment added.');
    const comments = await page.locator('[data-comment]').count();
    expect(comments).toBe(3);
  });
});

test.describe('Mobile tap targets', () => {
  test('all interactive elements >= 44px at 360px viewport', async ({ page, request }) => {
    const ts = String(Date.now() + 4);
    const id = await seedCounsellor(request, ts);
    await loginUser(request, ts);
    await page.setViewportSize({ width: 360, height: 800 });
    const profile = new CounsellorProfilePage(page);
    await profile.goto(id);
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height, `button ${i} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
