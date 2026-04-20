// Acceptance Test
// Traces to: T-018
// Description: Spouse settings page invite form, accept pending invite, and unlink with dialog confirmation.

import { test } from '@playwright/test';
import { SpouseSettingsPage } from '../pages/spouse-settings.page';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SIGNUP = `${BASE}/api/auth/signup`;
const VERIFY = `${BASE}/api/auth/verify`;
const LOGIN = `${BASE}/api/auth/login`;
const INVITE = `${BASE}/api/couple/invite`;
const ACCEPT = `${BASE}/api/couple/accept`;
const LAST_TOKEN = (email: string) => `${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`;

const PASSWORD = 'ValidPass123!';

type ApiRequest = Parameters<Parameters<typeof test>[1]>[0]['request'];

async function createActiveUser(request: ApiRequest, email: string): Promise<string> {
  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);
  const loginRes = await request.post(LOGIN, { data: { email, password: PASSWORD } });
  return loginRes.headers()['set-cookie']?.match(/sid=([^;]+)/)?.[1] ?? '';
}

async function setSession(page: Parameters<Parameters<typeof test>[1]>[0]['page'], sid: string): Promise<void> {
  await page.context().addCookies([{ name: 'sid', value: sid, domain: '127.0.0.1', path: '/' }]);
}

test.describe('Spouse settings page', () => {
  test('invite form sends invitation', async ({ page, request }) => {
    const ts = Date.now();
    const emailA = `ui-inviter-${ts}@example.com`;
    const emailB = `ui-invitee-${ts}@example.com`;

    const sidA = await createActiveUser(request, emailA);
    await createActiveUser(request, emailB);

    await setSession(page, sidA);
    const spousePage = new SpouseSettingsPage(page);
    await spousePage.goto();
    await spousePage.invite(emailB);
    await spousePage.expectInviteSent();
  });

  test('accept pending invitation links both users', async ({ page, request }) => {
    const ts = Date.now() + 1;
    const emailA = `ui-acc-a-${ts}@example.com`;
    const emailB = `ui-acc-b-${ts}@example.com`;

    const sidA = await createActiveUser(request, emailA);
    const sidB = await createActiveUser(request, emailB);

    await request.post(INVITE, { data: { email: emailB }, headers: { Cookie: `sid=${sidA}` } });
    const { token } = await (await request.get(LAST_TOKEN(emailB))).json() as { token: string };

    await setSession(page, sidB);
    const spousePage = new SpouseSettingsPage(page);
    await spousePage.goto(`/settings/spouse?token=${token}`);
    await spousePage.acceptPending();
    await spousePage.expectLinkedTo(emailA);
  });

  test('unlink dialog detaches both users', async ({ page, request }) => {
    const ts = Date.now() + 2;
    const emailA = `ui-ul-a-${ts}@example.com`;
    const emailB = `ui-ul-b-${ts}@example.com`;

    const sidA = await createActiveUser(request, emailA);
    const sidB = await createActiveUser(request, emailB);

    await request.post(INVITE, { data: { email: emailB }, headers: { Cookie: `sid=${sidA}` } });
    const { token } = await (await request.get(LAST_TOKEN(emailB))).json() as { token: string };
    await request.post(ACCEPT, { data: { token }, headers: { Cookie: `sid=${sidB}` } });

    await setSession(page, sidA);
    const spousePage = new SpouseSettingsPage(page);
    await spousePage.goto();
    await spousePage.expectLinkedTo(emailB);
    await spousePage.unlink();
    await spousePage.expectUnlinked();
  });
});
