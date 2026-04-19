import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCounsellorsMd } from '../src/counsellor/seed.ts';

const SERVER = process.env['SEED_SERVER'] ?? 'http://127.0.0.1:3000';
const MD_FILE = resolve(process.cwd(), 'christian_counsellors_L5A_4E6.md');

async function run(): Promise<void> {
  const content = await readFile(MD_FILE, 'utf8');
  const records = parseCounsellorsMd(content);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of records) {
    try {
      const res = await fetch(`${SERVER}/api/dev/seed/counsellor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, email: '' }),
      });
      if (res.status === 200) skipped++;
      else if (res.status === 201) inserted++;
      else { console.error(`Unexpected status ${res.status} for ${r.name}`); failed++; }
    } catch (err) {
      console.error(`Failed to seed ${r.name}:`, err);
      failed++;
    }
  }

  console.log(`Seeded: ${inserted} inserted, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
