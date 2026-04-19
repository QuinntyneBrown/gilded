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

  async rate(stars: 1 | 2 | 3 | 4 | 5): Promise<void> {
    await this.page.locator(`[data-star="${stars}"]`).click();
  }

  async writeReview(body: string): Promise<void> {
    await this.page.locator('[data-review-body]').fill(body);
    await this.page.getByRole('button', { name: /submit review/i }).click();
    await this.page.locator('[data-review]').first().waitFor({ timeout: 8_000 });
  }

  async reviewCount(): Promise<number> {
    return this.page.locator('[data-review]').count();
  }

  async addCommentOnReviewAt(index: number, body: string): Promise<void> {
    const review = this.page.locator('[data-review]').nth(index);
    const panel = review.locator('mat-expansion-panel');
    const expanded = await panel.getAttribute('class');
    if (!expanded?.includes('mat-expanded')) {
      await panel.locator('mat-expansion-panel-header').click();
    }
    await review.locator('[data-comment-body]').fill(body);
    await review.getByRole('button', { name: /add comment/i }).click();
    await review.locator('[data-comment]').last().waitFor({ timeout: 8_000 });
  }

  async deleteOwnReviewAt(index: number): Promise<void> {
    const review = this.page.locator('[data-review]').nth(index);
    await review.locator('[data-review-menu]').click();
    await this.page.getByRole('menuitem', { name: /delete/i }).click();
    await this.page.getByRole('button', { name: /confirm/i }).click();
  }
}
