import { expect, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class AppShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  override async goto(path: string): Promise<void> {
    await super.goto(path);
    // Wait for Angular's BreakpointObserver to settle the sidenav.
    // Initial render uses null (mode='side', closed); the breakpoint fires a tick later.
    await this.page.waitForFunction(() => {
      const el = document.querySelector('mat-sidenav');
      if (!el) return false;
      const cls = el.className;
      return cls.includes('mat-drawer-over') ||
        (cls.includes('mat-drawer-side') && cls.includes('mat-drawer-opened'));
    });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page.locator('mat-toolbar')).toContainText('Gilded');
  }

  async openSidenav(): Promise<void> {
    if (await this.isSidenavPinned()) return;
    await this.page.getByRole('button', { name: 'Toggle navigation' }).click();
    await this.page.locator('mat-sidenav.mat-drawer-opened').waitFor();
  }

  async closeSidenav(): Promise<void> {
    await this.page.getByRole('button', { name: 'Toggle navigation' }).click();
  }

  async clickNavLink(name: string): Promise<void> {
    await this.page.locator('mat-nav-list').getByRole('link', { name }).click();
  }

  async isSidenavPinned(): Promise<boolean> {
    const cls = await this.page.locator('mat-sidenav').getAttribute('class');
    return (cls ?? '').includes('mat-drawer-side');
  }

  async isSidenavOpen(): Promise<boolean> {
    const cls = await this.page.locator('mat-sidenav').getAttribute('class');
    return (cls ?? '').includes('mat-drawer-opened');
  }
}
