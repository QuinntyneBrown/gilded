// Acceptance Test
// Traces to: T-054 (L1-008)
// Description: Golden journey — sign in, rate counsellor 4 stars, write 500-char review,
//              comment on own review, verify aggregate, delete review and verify placeholder.

import { test, expect } from '@playwright/test';
import { signUpAndVerify, loginViaUI } from '../flows/signUpAndVerify';
import { CounsellorProfilePage } from '../pages/counsellor-profile.page';

const PASSWORD = 'ValidPass123!';
const LONG_REVIEW = 'A'.repeat(500);

test('rate, review, comment, aggregate, and delete', async ({ page }) => {
  const email = `reviewer-${Date.now()}@example.com`;

  await signUpAndVerify(page, email, PASSWORD);
  await loginViaUI(page, email, PASSWORD);

  // Seed a counsellor and navigate to their profile
  const seedRes = await page.request.post('/api/dev/seed/counsellor', {
    data: { name: 'Review Target', denomination: 'test', postal: 'L5A4E6' },
  });
  expect(seedRes.ok()).toBeTruthy();
  const { id: counsellorId } = await seedRes.json();

  const profile = new CounsellorProfilePage(page);
  await profile.goto(counsellorId);

  // Rate and review
  await profile.rate(4);
  await profile.writeReview(LONG_REVIEW);

  // Comment on own review
  await profile.addCommentOnReviewAt(0, 'Self comment');
  const count = await profile.reviewCount();
  expect(count).toBeGreaterThanOrEqual(1);

  // Reload to verify aggregate persisted
  await page.reload();
  await expect(page.locator('text=4')).toBeVisible();

  // Delete the review and check placeholder
  await profile.deleteOwnReviewAt(0);
  await expect(page.getByText(/deleted/i).or(page.getByText(/no reviews yet/i))).toBeVisible({ timeout: 8_000 });
});
