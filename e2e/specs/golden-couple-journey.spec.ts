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
