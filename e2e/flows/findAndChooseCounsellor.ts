import type { Page } from '@playwright/test';
import { SearchPage } from '../pages/search.page';
import { ShortlistPage } from '../pages/shortlist.page';

export async function findAndChooseCounsellor(page: Page, postal: string): Promise<string> {
  const search = new SearchPage(page);
  await search.goto();
  await search.search(postal);

  const results = await search.results();
  const limit = Math.min(3, results.length);
  for (let i = 0; i < limit; i++) {
    await search.shortlistAt(i);
  }

  const shortlist = new ShortlistPage(page);
  await shortlist.goto();
  const items = await shortlist.items();
  if (items.length === 0) throw new Error('shortlist is empty after shortlisting');

  await shortlist.chooseAt(0);
  await page.locator('[data-chosen]').first().waitFor({ timeout: 8_000 });

  const chosen = await page.locator('[data-shortlist-item]').first().getAttribute('data-shortlist-item');
  return chosen ?? '';
}
