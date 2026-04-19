import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface CounsellorCardSummary {
  name: string;
  distanceKm: number;
  denomination: string;
}

export class SearchPage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(path = '/search'): Promise<void> {
    await super.goto(path);
    await this.page.locator('mat-form-field').first().waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-form-field').first().waitFor();
  }

  async search(postal: string, radiusKm = 25): Promise<void> {
    await this.page.getByLabel('Postal code').fill(postal);
    if (radiusKm !== 25) {
      await this.page.getByLabel('Radius').click();
      await this.page.getByRole('option', { name: `${radiusKm} km` }).click();
    }
    await this.page.getByRole('button', { name: /^search$/i }).click();
    await this.waitForLoad();
  }

  async results(): Promise<CounsellorCardSummary[]> {
    await this.page.locator('mat-card.result-card').first().waitFor({ timeout: 10_000 });
    const cards = this.page.locator('mat-card.result-card');
    const count = await cards.count();
    return Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const card = cards.nth(i);
        const name = (await card.locator('mat-card-title').textContent() ?? '').trim();
        const distanceText = (await card.locator('mat-card-subtitle').textContent() ?? '').trim();
        const distanceKm = parseFloat(distanceText);
        const denomination = (await card.locator('mat-chip').first().textContent() ?? '').trim();
        return { name, distanceKm, denomination };
      }),
    );
  }

  async openProfileAt(index: number): Promise<void> {
    await this.page.locator('mat-card.result-card').nth(index).getByRole('button', { name: /profile/i }).click();
  }

  async shortlistAt(index: number): Promise<void> {
    await this.page.locator('mat-card.result-card').nth(index).getByRole('button', { name: /shortlist/i }).click();
  }

  async gotoPage(n: number): Promise<void> {
    const nextBtn = this.page.getByRole('button', { name: /next page/i });
    for (let i = 1; i < n; i++) {
      await nextBtn.click();
      await this.waitForLoad();
    }
  }

  async expectEmptyState(): Promise<void> {
    await this.page.getByText(/no counsellors match/i).waitFor({ timeout: 10_000 });
  }

  async expectPostalError(): Promise<void> {
    await this.page.locator('mat-error').waitFor({ timeout: 5_000 });
  }

  private async waitForLoad(): Promise<void> {
    await this.page.locator('mat-progress-spinner').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
  }
}
