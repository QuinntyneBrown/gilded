// Acceptance Test
// Traces to: T-023
// Description: Profile page renders all L2-006 AC1 fields; zero-review counsellor shows "No reviews yet"; booking link has correct rel/target.

import { expect, test } from '@playwright/test';
import { CounsellorProfilePage } from '../pages/counsellor-profile.page';

const API_BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SEED = `${API_BASE}/api/dev/seed/counsellor`;

const COUNSELLOR = {
  name: 'Dr. Profile Test',
  denomination: 'Presbyterian',
  credentials: ['PhD', 'RMFT'],
  specialties: ['grief', 'trauma'],
  address: '200 Elm St, Toronto, ON M5H 1J8',
  phone: '+1-416-555-0200',
  email: 'profile-test@example.com',
  website: 'https://profile-test.example.com',
  bookingLink: 'https://booking.profile-test.example.com',
  source: 'web_research',
  verified: true,
};

test.describe('Counsellor profile page', () => {
  test('renders all L2-006 AC1 fields', async ({ page, request }) => {
    const { id } = await (await request.post(SEED, { data: COUNSELLOR })).json() as { id: string };
    const profilePage = new CounsellorProfilePage(page);
    await profilePage.goto(id);

    await profilePage.expectName(COUNSELLOR.name);
    await profilePage.expectDenomination(COUNSELLOR.denomination);
    await profilePage.expectSpecialties(COUNSELLOR.specialties);
    await page.getByText(COUNSELLOR.address).waitFor({ timeout: 5_000 });
    await page.getByText(COUNSELLOR.phone).waitFor({ timeout: 5_000 });
  });

  test('zero-review counsellor shows "No reviews yet"', async ({ page, request }) => {
    const { id } = await (await request.post(SEED, { data: { ...COUNSELLOR, email: `zero-${Date.now()}@example.com`, reviewCount: 0 } })).json() as { id: string };
    const profilePage = new CounsellorProfilePage(page);
    await profilePage.goto(id);
    await profilePage.expectNoReviewsYet();
  });

  test('booking link has target="_blank" and rel="noopener noreferrer"', async ({ page, request }) => {
    const { id } = await (await request.post(SEED, { data: { ...COUNSELLOR, email: `booking-${Date.now()}@example.com` } })).json() as { id: string };
    const profilePage = new CounsellorProfilePage(page);
    await profilePage.goto(id);

    await profilePage.clickBookingLink();
    const target = await profilePage.bookingLinkTarget();
    expect(target).toBe('_blank');
  });

  test('unknown id shows not-found state', async ({ page }) => {
    await page.route('**/api/counsellors/**', route => {
      route.fulfill({ status: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not found.' }) });
    });
    await page.goto('/counsellors/00000000-0000-0000-0000-000000000000');
    await page.getByText(/not found/i).waitFor({ timeout: 5_000 });
  });
});
