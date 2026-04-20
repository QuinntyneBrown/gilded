// Acceptance Test
// Traces to: T-014
// Description: Login page happy path redirects to /search; bad creds show generic error; 429 shows rate-limit message.

import { test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

const BASE = process.env['API_BASE_URL'] ?? 'http://127.0.0.1:43121';
const SIGNUP = `${BASE}/api/auth/signup`;
const VERIFY = `${BASE}/api/auth/verify`;
const LAST_TOKEN = (email: string) =>
  `${BASE}/api/dev/last-token?email=${encodeURIComponent(email)}`;

const PASSWORD = 'ValidPass123!';

async function seedActiveUser(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  email: string,
): Promise<void> {
  await request.post(SIGNUP, { data: { email, password: PASSWORD } });
  const { token } = await (await request.get(LAST_TOKEN(email))).json() as { token: string };
  await request.get(`${VERIFY}?token=${token}`);
}

test.describe('Login page', () => {
  test('valid credentials redirect to /search', async ({ page, request }) => {
    const email = `login-page-ok-${Date.now()}@example.com`;
    await seedActiveUser(request, email);

    const login = new LoginPage(page);
    await login.goto('/login');
    await login.signIn(email, PASSWORD);
    await login.expectRedirectedToSearch();
  });

  test('invalid credentials show generic error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto('/login');
    await login.signIn(`nobody-${Date.now()}@example.com`, 'WrongPass456@');
    await login.expectGenericError();
  });

  test('429 response shows rate-limit message', async ({ page }) => {
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '900', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Too many failed attempts. Try again later.' }),
      });
    });

    const login = new LoginPage(page);
    await login.goto('/login');
    await login.signIn('test@example.com', 'anypass');
    await login.expectRateLimited();
  });
});
