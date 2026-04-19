import type { Page } from '@playwright/test';

export interface CounsellorInput {
  name: string;
  denomination: string;
  credentials?: string;
  specialties?: string;
  phone?: string;
  email?: string;
  address: string;
}

export class AddCounsellorPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/counsellors/new');
    await this.page.locator('app-add-counsellor').waitFor({ timeout: 10_000 });
  }

  async fill(fields: CounsellorInput): Promise<void> {
    if (fields.name) await this.page.locator('[data-field="name"]').fill(fields.name);
    if (fields.denomination) await this.page.locator('[data-field="denomination"]').fill(fields.denomination);
    if (fields.credentials) await this.page.locator('[data-field="credentials"]').fill(fields.credentials);
    if (fields.specialties) await this.page.locator('[data-field="specialties"]').fill(fields.specialties);
    if (fields.phone) await this.page.locator('[data-field="phone"]').fill(fields.phone);
    if (fields.email) await this.page.locator('[data-field="email"]').fill(fields.email);
    if (fields.address) await this.page.locator('[data-field="address"]').fill(fields.address);
  }

  async submit(): Promise<void> {
    await this.page.locator('button[data-action="submit"]').click();
  }

  async expectPendingReviewMessage(): Promise<void> {
    await this.page.locator('[data-state="pending-review"]').waitFor({ timeout: 10_000 });
  }

  async expectDuplicateDialogLinksToExistingProfile(): Promise<void> {
    await this.page.locator('mat-dialog-container a[data-role="existing-profile-link"]').waitFor({ timeout: 10_000 });
  }
}
