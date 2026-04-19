import type { Page } from '@playwright/test';

export class ModerationQueuePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/admin/counsellors/pending');
    await this.page.locator('app-moderation-queue').waitFor({ timeout: 10_000 });
  }

  async pendingCount(): Promise<number> {
    return this.page.locator('tr[data-pending]').count();
  }

  async approveAt(index: number): Promise<void> {
    await this.page.locator('button[data-action="approve"]').nth(index).click();
    await this.page.waitForTimeout(300);
  }

  async rejectAt(index: number, reason: string): Promise<void> {
    await this.page.locator('button[data-action="reject"]').nth(index).click();
    await this.page.locator('textarea[data-role="rejection-reason"]').fill(reason);
    await this.page.locator('button[data-action="confirm-reject"]').click();
    await this.page.waitForTimeout(300);
  }
}
