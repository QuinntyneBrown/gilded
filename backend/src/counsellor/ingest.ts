import { randomUUID } from 'node:crypto';
import type { CounsellorStore } from './counsellor-store.ts';

interface IngestRecord {
  name: string;
  credentials?: string[];
  phone?: string;
  address?: string;
  email?: string;
  sourceUrl?: string;
  denomination?: string;
  specialties?: string[];
}

export interface IngestResult {
  processed: number;
  inserted: number;
  merged: number;
  skipped: number;
  durationMs: number;
}

export async function ingestCounsellors(
  store: CounsellorStore,
  sourceUrl: string,
  opts: { apiKey?: string } = {},
): Promise<IngestResult> {
  const start = Date.now();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.apiKey) headers['Authorization'] = `Bearer ${opts.apiKey}`;

  const res = await fetch(sourceUrl, { headers });
  if (!res.ok) throw new Error(`Ingestion fetch failed: ${res.status}`);

  const records = await res.json() as IngestRecord[];
  let inserted = 0;
  let merged = 0;
  let skipped = 0;

  for (const r of records) {
    if (!r.name || !r.address) { skipped++; continue; }

    const normalizedName = r.name.toLowerCase().trim();
    const normalizedAddress = (r.address ?? '').toLowerCase().trim();
    const phone = r.phone ?? '';
    const email = r.email ?? '';

    const dup = await store.findDuplicate(normalizedName, normalizedAddress, phone, email);
    if (dup) { merged++; continue; }

    await store.create({
      id: randomUUID(),
      name: r.name,
      normalizedName,
      denomination: r.denomination ?? 'Christian (Non-denominational)',
      credentials: r.credentials ?? [],
      specialties: r.specialties ?? ['Faith-integrated therapy'],
      address: r.address,
      normalizedAddress,
      phone,
      email,
      source: 'web_research',
      verified: false,
      sourceUrl: r.sourceUrl,
      reviewCount: 0,
    });
    inserted++;
  }

  const durationMs = Date.now() - start;
  console.log(JSON.stringify({ source: sourceUrl, processed: records.length, inserted, merged, skipped, durationMs }));

  return { processed: records.length, inserted, merged, skipped, durationMs };
}
