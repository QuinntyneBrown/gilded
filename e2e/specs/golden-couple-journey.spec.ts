// Acceptance Test
// Traces to: T-054 (L1-001, L1-002, L1-005)
// Description: Golden journey — couple signs up, links, finds a Mississauga counsellor,
//              shortlists, marks chosen, opens booking link; other spouse sees notification.

import { test, expect } from '@playwright/test';
import { signUpAndVerify } from '../flows/signUpAndVerify';
import { loginViaUI } from '../flows/signUpAndVerify';
import { linkSpouse } from '../flows/linkSpouse';
import { findAndChooseCounsellor } from '../flows/findAndChooseCounsellor';

const PASSWORD = 'ValidPass123!';
const API_BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';

async function seedMississaugaFixtures(page: import('@playwright/test').Page, ts: number): Promise<void> {
  await page.request.post('/api/dev/seed/postal', {
    data: { code: 'L5A4E6', lat: 43.589, lng: -79.6441 },
  });

  const fixtures = [
    { name: `Golden Couple ${ts}-1`, lat: 43.589, lng: -79.6441 },
    { name: `Golden Couple ${ts}-2`, lat: 43.596, lng: -79.6465 },
    { name: `Golden Couple ${ts}-3`, lat: 43.5825, lng: -79.6389 },
  ];

  for (const [index, fixture] of fixtures.entries()) {
    const res = await page.request.post(`${API_BASE}/api/dev/seed/counsellor`, {
      data: {
        name: fixture.name,
        denomination: 'Christian (Non-denominational)',
        credentials: ['M.Div'],
        specialties: ['Marriage'],
        address: `${index + 1} Golden Way, Mississauga, ON`,
        phone: `+1-905-555-${String(ts + index).slice(-4)}`,
        bookingLink: `https://booking.example.com/${ts}-${index}`,
        source: 'web_research',
        verified: true,
        lat: fixture.lat,
        lng: fixture.lng,
      },
    });
    expect(res.ok()).toBeTruthy();
  }
}

test('couple finds, shortlists and marks chosen counsellor', async ({ browser }) => {
  const ts = Date.now();
  const emailA = `couple-a-${ts}@example.com`;
  const emailB = `couple-b-${ts}@example.com`;

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await signUpAndVerify(pageA, emailA, PASSWORD);
    await signUpAndVerify(pageB, emailB, PASSWORD);

    await loginViaUI(pageA, emailA, PASSWORD);
    await loginViaUI(pageB, emailB, PASSWORD);

    await linkSpouse(pageA, pageB, emailB);
    await seedMississaugaFixtures(pageA, ts);

    const chosenId = await findAndChooseCounsellor(pageA, 'L5A4E6');
    expect(chosenId).toBeTruthy();

    // B navigates to shortlist and sees the chosen flag
    await pageB.goto('/shortlist');
    await pageB.locator('[data-chosen]').waitFor({ timeout: 10_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
