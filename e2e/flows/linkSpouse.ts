import type { Page } from '@playwright/test';
import { SpouseSettingsPage } from '../pages/spouse-settings.page';

export async function linkSpouse(pageA: Page, pageB: Page, emailB: string): Promise<void> {
  const settingsA = new SpouseSettingsPage(pageA);
  await settingsA.goto();
  await settingsA.invite(emailB);
  await settingsA.expectInviteSent();

  const res = await pageB.request.get(`/api/dev/last-token?email=${encodeURIComponent(emailB)}`);
  const { token } = await res.json() as { token: string };
  await pageB.goto(`/couple/accept?token=${token}`);
  await pageB.waitForLoadState('networkidle');
}
