import type { Page } from '@playwright/test';
import { SpouseSettingsPage } from '../pages/spouse-settings.page';

export async function linkSpouse(pageA: Page, pageB: Page, emailB: string): Promise<void> {
  const settingsA = new SpouseSettingsPage(pageA);
  const settingsB = new SpouseSettingsPage(pageB);
  await settingsA.goto();
  await settingsA.invite(emailB);
  await settingsA.expectInviteSent();

  const res = await pageB.request.get(`/api/dev/last-token?email=${encodeURIComponent(emailB)}`);
  const { token } = await res.json() as { token: string };
  await settingsB.goto(`/settings/spouse?token=${token}`);
  await settingsB.acceptPending();
  await pageB.getByRole('button', { name: /unlink/i }).waitFor({ timeout: 10_000 });
}
