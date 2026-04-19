import { InMemoryCounsellorStore } from '../src/counsellor/counsellor-store.ts';
import { ingestCounsellors } from '../src/counsellor/ingest.ts';

const SOURCE_URL = process.env['INGEST_SOURCE_URL'];
const API_KEY = process.env['INGEST_API_KEY'];

if (!SOURCE_URL) {
  console.error('INGEST_SOURCE_URL env var is required');
  process.exit(1);
}

const store = new InMemoryCounsellorStore();
ingestCounsellors(store, SOURCE_URL, { apiKey: API_KEY })
  .then(r => { console.log('Done:', r); })
  .catch(err => { console.error('Ingest failed:', err instanceof Error ? err.message : String(err)); process.exit(1); });
