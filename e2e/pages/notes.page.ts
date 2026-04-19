import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class NotesPage extends BasePage {
  constructor(page: Page) { super(page); }

  override async goto(): Promise<void> {
    await super.goto('/notes');
    await this.page.locator('mat-tab-group').waitFor({ timeout: 10_000 });
  }

  async expectVisible(): Promise<void> {
    await this.page.locator('mat-tab-group').waitFor();
  }

  async openTab(tab: 'private' | 'spouse' | 'public'): Promise<void> {
    const label = tab.charAt(0).toUpperCase() + tab.slice(1);
    await this.page.getByRole('tab', { name: new RegExp(label, 'i') }).click();
    await this.page.waitForTimeout(300);
  }

  async createNote(body: string): Promise<void> {
    await this.page.locator('[data-create-body]:visible').fill(body);
    await this.page.locator('[data-create-submit]:visible').click();
    await this.page.waitForTimeout(500);
  }

  async notes(): Promise<string[]> {
    const items = await this.page.locator('[data-note-body]:visible').allTextContents();
    return items.map(s => s.trim());
  }

  async editNoteAt(index: number, newBody: string): Promise<void> {
    await this.page.locator('[data-note]:visible').nth(index).locator('[data-note-edit]').click();
    const editArea = this.page.locator('[data-edit-body]:visible');
    await editArea.clear();
    await editArea.fill(newBody);
    await this.page.locator('[data-edit-save]:visible').click();
    await this.page.waitForTimeout(500);
  }

  async deleteNoteAt(index: number): Promise<void> {
    await this.page.locator('[data-note]:visible').nth(index).locator('[data-note-delete]').click();
    await this.page.waitForTimeout(300);
  }

  async expectSpouseTabDisabled(): Promise<void> {
    await this.page.locator('[data-spouse-disabled]').waitFor({ timeout: 5_000 });
  }
}
