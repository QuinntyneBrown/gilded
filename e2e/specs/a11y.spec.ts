// Acceptance Test
// Traces to: T-051
// Description: WCAG 2.1 AA — zero critical/serious axe violations and keyboard-visible
//              focus order on all primary screens.

import { expect } from '@playwright/test';
import { test } from '../fixtures/axe';

const publicScreens: { name: string; path: string }[] = [
  { name: 'signup',          path: '/signup' },
  { name: 'login',           path: '/login' },
  { name: 'search',          path: '/search' },
  { name: 'shortlist',       path: '/shortlist' },
  { name: 'password reset',  path: '/reset-request' },
  { name: 'notes',           path: '/notes' },
  { name: 'spouse settings', path: '/spouse-settings' },
];

for (const { name, path } of publicScreens) {
  test(`${name} page passes axe WCAG AA audit`, async ({ page, checkA11y }) => {
    await page.goto(path);
    await checkA11y();
  });

  test(`${name} page Tab key moves focus visibly`, async ({ page }) => {
    await page.goto(path);
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
}

test('admin moderation page passes axe WCAG AA audit', async ({ page, checkA11y }) => {
  await page.goto('/admin/moderation');
  await checkA11y();
});

test('admin moderation page Tab key moves focus visibly', async ({ page }) => {
  await page.goto('/admin/moderation');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
});
