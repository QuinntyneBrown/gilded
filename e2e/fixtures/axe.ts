import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type A11yFixtures = { checkA11y(): Promise<void> };

export { expect };
export const test = base.extend<A11yFixtures>({
  checkA11y: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const crit = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
      expect(crit, crit.map(v => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')).toHaveLength(0);
    });
  },
});
