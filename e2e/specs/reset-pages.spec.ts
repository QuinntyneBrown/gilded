// Acceptance Test
// Traces to: T-015
// Description: Reset request always shows confirmation; valid token sets password and redirects to /login; bad token shows error.

import { test } from '@playwright/test';
import { ResetRequestPage } from '../pages/reset-request.page';
import { ResetCompletePage } from '../pages/reset-complete.page';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SIGNUP = `${BASE}/api/auth/signup`;
const VERIFY = `${BASE}/api/auth/verify`;
const RESET_REQ = `${BASE}/api/auth/reset-request`;
const LAST_TOKEN = (email: string) =>
  `${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`;

const PASSWORD = 'ValidPass123!';
const NEW_PASSWORD = 'NewSecure456@';

async function seedActiveUser(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  email: string,
): Promise<void> {
  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);
}

test.describe('Reset request page', () => {
  test('any email shows confirmation (no enumeration)', async ({ page }) => {
    const resetReq = new ResetRequestPage(page);
    await resetReq.goto('/reset-request');
    await resetReq.requestReset(`unknown-${Date.now()}@example.com`);
    await resetReq.expectConfirmation();
  });
});

test.describe('Reset complete page', () => {
  test('valid token and compliant password → redirects to /login', async ({ page, request }) => {
    const email = `reset-ui-${Date.now()}@example.com`;
    await seedActiveUser(request, email);
    await request.post(RESET_REQ, { data: { email } });
    const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };

    const resetComplete = new ResetCompletePage(page);
    await resetComplete.goto(`/reset-complete?token=${token}`);
    await resetComplete.fillPassword(NEW_PASSWORD);
    await resetComplete.submit();
    await resetComplete.expectRedirectedToLogin();
  });

  test('invalid token shows error', async ({ page }) => {
    await page.route('**/api/auth/reset-complete', route => {
      route.fulfill({
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or expired token.' }),
      });
    });

    const resetComplete = new ResetCompletePage(page);
    await resetComplete.goto('/reset-complete?token=deadbeef');
    await resetComplete.fillPassword(NEW_PASSWORD);
    await resetComplete.submit();
    await resetComplete.expectError();
  });
});
