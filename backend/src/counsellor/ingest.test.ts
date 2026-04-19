import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { InMemoryCounsellorStore } from './counsellor-store.ts';
import { ingestCounsellors } from './ingest.ts';

const makeExisting = (id: string, name: string, address: string, phone: string, email: string) => ({
  id,
  name,
  normalizedName: name.toLowerCase().trim(),
  denomination: 'Test',
  credentials: [] as string[],
  specialties: [] as string[],
  address,
  normalizedAddress: address.toLowerCase().trim(),
  phone,
  email,
  source: 'web_research' as const,
  verified: false,
  reviewCount: 0,
});

const FIXTURE_RECORDS = [
  // 7 new unique records
  { name: 'Carol White', credentials: ['PhD'], phone: '+1-416-555-0010', address: 'Mississauga, ON', email: 'carol@example.com', sourceUrl: 'https://example.com/1' },
  { name: 'Dan Green', credentials: ['MSW'], phone: '+1-416-555-0011', address: 'Brampton, ON', email: 'dan@example.com', sourceUrl: 'https://example.com/2' },
  { name: 'Eve Brown', credentials: ['RP'], phone: '+1-416-555-0012', address: 'Oakville, ON', email: 'eve@example.com', sourceUrl: 'https://example.com/3' },
  { name: 'Frank Black', credentials: [], phone: '+1-416-555-0013', address: 'Burlington, ON', email: 'frank@example.com', sourceUrl: 'https://example.com/4' },
  { name: 'Grace Hall', credentials: ['MA'], phone: '+1-416-555-0014', address: 'Hamilton, ON', email: 'grace@example.com', sourceUrl: 'https://example.com/5' },
  { name: 'Henry Ford', credentials: ['MDiv'], phone: '+1-416-555-0015', address: 'London, ON', email: 'henry@example.com', sourceUrl: 'https://example.com/6' },
  { name: 'Irene Chan', credentials: ['RSW'], phone: '+1-416-555-0016', address: 'Windsor, ON', email: 'irene@example.com', sourceUrl: 'https://example.com/7' },
  // 2 duplicates — matched by phone against existing records
  { name: 'Alice S.', credentials: ['RP'], phone: '+1-416-555-0001', address: 'Toronto, ON', email: 'alice.new@example.com', sourceUrl: 'https://example.com/dup1' },
  { name: 'Robert Jones', credentials: ['MA'], phone: '+1-613-555-0002', address: 'Ottawa, ON', email: 'bob.new@example.com', sourceUrl: 'https://example.com/dup2' },
  // 1 missing name → skipped
  { name: '', credentials: [], phone: '+1-416-555-0019', address: 'Toronto, ON', email: 'noname@example.com', sourceUrl: 'https://example.com/noname' },
];

function startFixtureServer(records: unknown[]): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const srv = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(records));
    });
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as AddressInfo;
      resolve({ port, close: () => new Promise<void>(r => srv.close(() => r())) });
    });
    srv.on('error', reject);
  });
}

test('ingest 10 records: 7 inserted, 2 merged, 1 skipped', async () => {
  const store = new InMemoryCounsellorStore();
  await store.create(makeExisting('exist-1', 'Alice Smith', 'Toronto, ON', '+1-416-555-0001', 'alice@example.com'));
  await store.create(makeExisting('exist-2', 'Bob Jones', 'Ottawa, ON', '+1-613-555-0002', 'bob@example.com'));

  const { port, close } = await startFixtureServer(FIXTURE_RECORDS);
  try {
    const result = await ingestCounsellors(store, `http://127.0.0.1:${port}/feed`);
    assert.equal(result.inserted, 7);
    assert.equal(result.merged, 2);
    assert.equal(result.skipped, 1);
    assert.equal(result.processed, 10);
    const all = await store.findAll();
    assert.equal(all.length, 9); // 2 pre-existing + 7 new
  } finally {
    await close();
  }
});

test('ingest logs no API key value', async () => {
  const store = new InMemoryCounsellorStore();
  const { port, close } = await startFixtureServer([]);
  const logLines: string[] = [];
  const orig = console.log;
  console.log = (msg: unknown) => { logLines.push(String(msg)); };
  try {
    await ingestCounsellors(store, `http://127.0.0.1:${port}/feed`, { apiKey: 'secret-key-abc123' });
    assert.ok(!logLines.some(l => l.includes('secret-key-abc123')), 'API key must not appear in logs');
  } finally {
    console.log = orig;
    await close();
  }
});
