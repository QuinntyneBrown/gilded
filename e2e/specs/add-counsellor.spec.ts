// Acceptance Test
// Traces to: T-029
// Description: /counsellors/new — valid submission, duplicate dialog, phone keyboard type.

import { expect, test } from '@playwright/test';
import { AddCounsellorPage } from '../pages/add-counsellor.page';

const BASE = 'http://127.0.0.1:3000';
const SEED = `${BASE}/api/dev/seed/counsellor`;

const VALID_INPUT = {
  name: 'Dr. Angela Mercer',
  denomination: 'Christian (Non-denominational)',
  credentials: 'PhD, RP',
  specialties: 'Anxiety, Depression',
  phone: '+1-613-555-2001',
  address: '45 Queen St, Ottawa, ON',
};

test.describe('/counsellors/new', () => {
  test('valid submission shows pending-review state', async ({ page, request }) => {
    const ts = Date.now();
    const email = `add-counsel-${ts}@example.com`;
    await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
    const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
    await request.get(`${BASE}/api/auth/verify?token=${token}`);
    const loginRes = await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
    const sid = loginRes.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? '';
    await page.context().addCookies([{ name: 'sid', value: sid, domain: '127.0.0.1', path: '/' }]);

    const addPage = new AddCounsellorPage(page);
    await addPage.goto();
    await addPage.fill({ ...VALID_INPUT, phone: `+1-613-555-${String(ts).slice(-4)}` });
    await addPage.submit();
    await addPage.expectPendingReviewMessage();
  });

  test('duplicate submission opens dialog with link to existing profile', async ({ page, request }) => {
    const ts = Date.now() + 1;
    const phone = `+1-613-555-${String(ts).slice(-4)}`;

    // Seed an existing counsellor with the same phone
    await request.post(SEED, {
      data: { name: 'Existing Counsellor', denomination: 'Test', credentials: [], specialties: [], address: 'Ottawa, ON', phone, source: 'web_research', verified: false },
    });

    const email = `add-dup-${ts}@example.com`;
    await request.post(`${BASE}/api/auth/signup`, { data: { email, password: 'Password1!' } });
    const { token } = await (await request.get(`${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`)).json() as { token: string };
    await request.get(`${BASE}/api/auth/verify?token=${token}`);
    const loginRes = await request.post(`${BASE}/api/auth/login`, { data: { email, password: 'Password1!' } });
    const sid = loginRes.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? '';
    await page.context().addCookies([{ name: 'sid', value: sid, domain: '127.0.0.1', path: '/' }]);

    const addPage = new AddCounsellorPage(page);
    await addPage.goto();
    await addPage.fill({ ...VALID_INPUT, phone });
    await addPage.submit();
    await addPage.expectDuplicateDialogLinksToExistingProfile();
  });

  test('phone input uses tel keyboard type', async ({ page }) => {
    await page.goto('/counsellors/new');
    await page.locator('app-add-counsellor').waitFor({ timeout: 10_000 });
    const inputType = await page.locator('[data-field="phone"]').getAttribute('type');
    expect(inputType).toBe('tel');
  });
});
