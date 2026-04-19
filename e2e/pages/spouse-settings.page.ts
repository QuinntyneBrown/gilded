import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SpouseSettingsPage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(path = '/settings/spouse'): Promise<void> {
    await super.goto(path);
    await this.page.locator('mat-card').first().waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-card').first().waitFor();
  }

  async invite(email: string): Promise<void> {
    await this.page.getByLabel('Spouse email').fill(email);
    await this.page.getByRole('button', { name: /send invitation/i }).click();
  }

  async acceptPending(): Promise<void> {
    await this.page.getByRole('button', { name: /accept/i }).click();
  }

  async unlink(): Promise<void> {
    await this.page.getByRole('button', { name: /unlink/i }).click();
    await this.page.getByRole('dialog').waitFor({ timeout: 5_000 });
    await this.page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
  }

  async expectLinkedTo(email: string): Promise<void> {
    await this.page.getByText(email).waitFor({ timeout: 10_000 });
  }

  async expectUnlinked(): Promise<void> {
    await this.page.getByLabel('Spouse email').waitFor({ timeout: 10_000 });
  }

  async expectInviteSent(): Promise<void> {
    await this.page.getByRole('status').waitFor({ timeout: 5_000 });
  }
}
