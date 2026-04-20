// Acceptance Test
// Traces to: T-054 (L1-006, L1-007)
// Description: Golden journey — three-tier notes with realistic auth.
//   Spouse A private note is invisible to B; spouse note visible to both; public note
//   visible to solo user D; unlink causes spouse note to disappear for B.

import { test, expect } from '@playwright/test';
import { signUpAndVerify, loginViaUI } from '../flows/signUpAndVerify';
import { linkSpouse } from '../flows/linkSpouse';
import { writeNotesAcrossVisibilities } from '../flows/writeNotesAcrossVisibilities';

const PASSWORD = 'ValidPass123!';

test('three-tier note visibility after link and after unlink', async ({ browser }) => {
  const ts = Date.now();
  const emailA = `notes-a-${ts}@example.com`;
  const emailB = `notes-b-${ts}@example.com`;
  const emailD = `notes-d-${ts}@example.com`;

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const ctxD = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const pageD = await ctxD.newPage();

  try {
    await signUpAndVerify(pageA, emailA, PASSWORD);
    await signUpAndVerify(pageB, emailB, PASSWORD);
    await signUpAndVerify(pageD, emailD, PASSWORD);

    await loginViaUI(pageA, emailA, PASSWORD);
    await loginViaUI(pageB, emailB, PASSWORD);
    await loginViaUI(pageD, emailD, PASSWORD);

    await linkSpouse(pageA, pageB, emailB);

    const { privateNote, spouseNote, publicNote } = await writeNotesAcrossVisibilities(pageA);

    // A can see own private note
    await pageA.goto('/notes');
    await expect(pageA.getByText(privateNote)).toBeVisible();

    // B cannot see A's private note (Spouse tab shows shared note)
    await pageB.goto('/notes');
    await expect(pageB.getByText(privateNote)).not.toBeVisible();

    // Both A and B see the spouse note
    await expect(pageA.getByText(spouseNote)).toBeVisible();
    await pageB.reload();
    await expect(pageB.getByText(spouseNote)).toBeVisible();

    // Solo user D sees public note in public feed
    await pageD.goto('/notes');
    await pageD.getByRole('tab', { name: /public/i }).click();
    await expect(pageD.getByText(publicNote)).toBeVisible();

    // After unlink, B's spouse tab no longer shows the shared note
    await pageA.goto('/settings/spouse');
    await pageA.getByRole('button', { name: /unlink/i }).click();
    await pageA.getByRole('dialog').waitFor();
    await pageA.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();

    await pageB.reload();
    await pageB.getByRole('tab', { name: /spouse/i }).click();
    await expect(pageB.getByText(spouseNote)).not.toBeVisible();
  } finally {
    await ctxA.close();
    await ctxB.close();
    await ctxD.close();
  }
});
