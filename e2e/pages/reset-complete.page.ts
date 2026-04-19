import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class ResetCompletePage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(path: string): Promise<void> {
    await super.goto(path);
    await this.page.locator('mat-form-field').first().waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-form-field').first().waitFor();
  }

  async fillPassword(pwd: string): Promise<void> {
    await this.page.getByLabel('New password').fill(pwd);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /set password/i }).click();
  }

  async expectRedirectedToLogin(): Promise<void> {
    await this.page.waitForURL('**/login', { timeout: 10_000 });
  }

  async expectError(): Promise<void> {
    await this.page.getByRole('alert').waitFor({ timeout: 10_000 });
  }
}
