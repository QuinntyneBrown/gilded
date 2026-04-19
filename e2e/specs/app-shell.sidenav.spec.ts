// Acceptance Test
// Traces to: T-006
// Description: Sidenav collapses on narrow viewport and is pinned on wide viewport.

import { expect, test } from '@playwright/test';
import { AppShellPage } from '../pages/app-shell.page';

test.describe('app shell sidenav', () => {
  test('collapses on narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const shell = new AppShellPage(page);
    await shell.goto('/');
    await shell.expectVisible();
    expect(await shell.isSidenavPinned()).toBe(false);
    await shell.openSidenav();
    expect(await shell.isSidenavOpen()).toBe(true);
  });

  test('pinned on wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const shell = new AppShellPage(page);
    await shell.goto('/');
    await shell.expectVisible();
    expect(await shell.isSidenavPinned()).toBe(true);
    await shell.openSidenav();
    expect(await shell.isSidenavOpen()).toBe(true);
  });
});
