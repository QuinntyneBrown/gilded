import type { Page } from '@playwright/test';
import { SignupPage } from '../pages/signup.page';
import { LoginPage } from '../pages/login.page';

export async function signUpAndVerify(page: Page, email: string, password: string): Promise<void> {
  const signup = new SignupPage(page);
  await signup.goto('/signup');
  await signup.fillEmail(email);
  await signup.fillPassword(password);
  await signup.submit();
  await signup.expectConfirmation();

  const res = await page.request.get(`/api/dev/last-token?email=${encodeURIComponent(email)}`);
  const { token } = await res.json() as { token: string };
  await page.goto(`/verify?token=${token}`);
}

export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  const login = new LoginPage(page);
  await login.goto('/login');
  await login.signIn(email, password);
  await login.expectRedirectedToSearch();
}
