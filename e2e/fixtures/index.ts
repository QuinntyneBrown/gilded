import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  // Per-task fixtures (authenticatedPage, seededCouple, etc.) are added here.
});

export { expect };
