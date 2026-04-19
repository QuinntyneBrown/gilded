// Acceptance Test
// Traces to: L1-011, L1-012, L1-014, L1-016
// Description: The app shell renders with the Gilded brand and the backend health endpoint responds.

import { expect, test } from '@playwright/test';

test('renders the app shell and returns a healthy backend status', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('mat-toolbar')).toContainText('Gilded');

  const response = await request.get('http://127.0.0.1:3000/health');
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 'ok' });
});
