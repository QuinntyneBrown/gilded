import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InMemoryCounsellorStore } from './counsellor-store.ts';
import { seedCounsellors } from './seed.ts';

const DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(DIR, '../../tests/fixtures/christian_counsellors_L5A_4E6.md');

test('seeds 108 counsellors from fixture', async () => {
  const store = new InMemoryCounsellorStore();
  const content = readFileSync(FIXTURE, 'utf8');
  const { inserted } = await seedCounsellors(store, content);
  assert.equal(inserted, 108);
  const all = await store.findAll();
  assert.equal(all.length, 108);
  for (const c of all) {
    assert.ok(c.sourceUrl, 'sourceUrl must be set');
    assert.equal(c.source, 'web_research');
    assert.equal(c.verified, false);
  }
});

test('idempotent: second seed inserts 0 rows', async () => {
  const store = new InMemoryCounsellorStore();
  const content = readFileSync(FIXTURE, 'utf8');
  await seedCounsellors(store, content);
  const { inserted, skipped } = await seedCounsellors(store, content);
  assert.equal(inserted, 0);
  assert.equal(skipped, 108);
  const all = await store.findAll();
  assert.equal(all.length, 108);
});
