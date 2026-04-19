import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SignupPage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(path: string): Promise<void> {
    await super.goto(path);
    await this.page.locator('mat-form-field').first().waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-form-field').first().waitFor();
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.getByLabel('Email').fill(email);
  }

  async fillPassword(pwd: string): Promise<void> {
    await this.page.getByLabel('Password').fill(pwd);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /sign up/i }).click();
  }

  async expectConfirmation(): Promise<void> {
    await this.page.getByText(/check your email/i).waitFor({ timeout: 10_000 });
  }

  async expectPasswordPolicyHint(): Promise<void> {
    await this.page.locator('mat-error').waitFor();
  }
}
