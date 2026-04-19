import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class ShortlistPage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(): Promise<void> {
    await super.goto('/shortlist');
    await this.page.locator('[data-shortlist-item], .no-shortlist').first().waitFor({ timeout: 10_000 });
  }

  async items(): Promise<string[]> {
    const names = await this.page.locator('[data-shortlist-item] [data-counsellor-name]').allTextContents();
    return names.map(n => n.trim());
  }

  async chooseAt(index: number): Promise<void> {
    await this.page.locator('[data-shortlist-item]').nth(index).getByRole('button', { name: /choose/i }).click();
  }

  async removeAt(index: number): Promise<void> {
    await this.page.locator('[data-shortlist-item]').nth(index).getByRole('button', { name: /remove/i }).click();
  }

  async isChosen(index: number): Promise<boolean> {
    const item = this.page.locator('[data-shortlist-item]').nth(index);
    return item.locator('[data-chosen]').isVisible();
  }
}
