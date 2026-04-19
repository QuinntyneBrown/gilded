import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(path: string): Promise<void> {
    await super.goto(path);
    await this.page.locator('mat-form-field').first().waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-form-field').first().waitFor();
  }

  async signIn(email: string, pwd: string): Promise<void> {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(pwd);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }

  async expectGenericError(): Promise<void> {
    await this.page.getByRole('alert').filter({ hasText: /invalid email or password/i }).waitFor();
  }

  async expectRateLimited(): Promise<void> {
    await this.page.getByRole('alert').filter({ hasText: /too many/i }).waitFor();
  }

  async expectRedirectedToSearch(): Promise<void> {
    await this.page.waitForURL('**/search', { timeout: 10_000 });
  }
}
