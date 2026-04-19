import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CounsellorProfilePage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(id: string): Promise<void> {
    await super.goto(`/counsellors/${id}`);
    await this.page.locator('mat-card').first().waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-card').first().waitFor();
  }

  async expectName(name: string): Promise<void> {
    await this.page.getByText(name, { exact: true }).waitFor({ timeout: 5_000 });
  }

  async expectDenomination(text: string): Promise<void> {
    await this.page.getByText(text).waitFor({ timeout: 5_000 });
  }

  async expectSpecialties(list: string[]): Promise<void> {
    for (const s of list) {
      await this.page.locator('mat-chip').getByText(s).waitFor({ timeout: 5_000 });
    }
  }

  async expectNoReviewsYet(): Promise<void> {
    await this.page.getByText(/no reviews yet/i).waitFor({ timeout: 5_000 });
  }

  async clickBookingLink(): Promise<void> {
    const link = this.page.locator('[rel="noopener noreferrer"]');
    await link.waitFor({ timeout: 5_000 });
  }

  async bookingLinkTarget(): Promise<string | null> {
    const link = this.page.locator('[rel="noopener noreferrer"]');
    return link.getAttribute('target');
  }

  async shortlist(): Promise<void> {
    await this.page.getByRole('button', { name: /shortlist/i }).click();
  }
}
