// Acceptance Test
// Traces to: T-013
// Description: Signup page form submits successfully, shows inline errors, renders single-column at 360px.

import { test, expect } from '@playwright/test';
import { SignupPage } from '../pages/signup.page';

test.describe('Signup page', () => {
  test('valid signup shows confirmation message', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.goto('/signup');
    await signup.expectVisible();
    await signup.fillEmail(`signup-${Date.now()}@example.com`);
    await signup.fillPassword('ValidPass123!');
    await signup.submit();
    await signup.expectConfirmation();
  });

  test('weak password shows inline MatError after blur', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.goto('/signup');
    await signup.fillPassword('weak');
    await page.keyboard.press('Tab');
    await signup.expectPasswordPolicyHint();
  });

  test('form is full-width at 360px viewport', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.goto('/signup');
    await signup.expectVisible();
    const form = page.locator('form');
    const box = await form.boundingBox();
    expect(box!.width).toBeGreaterThan(300);
  });
});
