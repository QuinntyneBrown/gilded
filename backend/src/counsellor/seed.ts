import { randomUUID } from 'node:crypto';
import type { CounsellorStore, Counsellor } from './counsellor-store.ts';

interface SeedRecord {
  name: string;
  credentials: string[];
  phone: string;
  sourceUrl: string;
  address: string;
  denomination: string;
  specialties: string[];
}

function extractAddress(url: string): string {
  const m = url.match(/\/therapists\/([a-z0-9-]+)-([a-z]{2})\/\d+\/?$/);
  if (!m) return 'Mississauga, ON';
  const words = m[1].split('-');
  const city = words[words.length - 1];
  const province = m[2].toUpperCase();
  return `${city.charAt(0).toUpperCase() + city.slice(1)}, ${province}`;
}

export function parseCounsellorsMd(content: string): SeedRecord[] {
  const results: SeedRecord[] = [];
  let section: 'individual' | 'centres' | null = null;

  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t.includes('Individual Counsellors')) { section = 'individual'; continue; }
    if (t.includes('Established Christian Counselling Centres')) { section = 'centres'; continue; }
    if (!t.startsWith('|')) continue;
    if (/^\|[-| ]+\|$/.test(t) || t.startsWith('| #') || t.startsWith('| Organization')) continue;

    const cols = t.split('|').slice(1, -1).map(c => c.trim());

    if (section === 'individual' && cols.length >= 5) {
      const [, name, credStr, phone, url] = cols;
      results.push({
        name,
        credentials: credStr.split(',').map(c => c.trim()).filter(Boolean),
        phone,
        sourceUrl: url,
        address: extractAddress(url),
        denomination: 'Christian (Non-denominational)',
        specialties: ['Faith-integrated therapy'],
      });
    }

    if (section === 'centres' && cols.length >= 3) {
      const phone = cols[1] === 'See website' ? '' : cols[1];
      results.push({
        name: cols[0],
        credentials: [],
        phone,
        sourceUrl: cols[2],
        address: 'Mississauga, ON',
        denomination: 'Christian Counselling Centre',
        specialties: ['Faith-integrated therapy'],
      });
    }
  }

  return results;
}

export async function seedCounsellors(
  store: CounsellorStore,
  content: string,
): Promise<{ inserted: number; skipped: number }> {
  const records = parseCounsellorsMd(content);
  let inserted = 0;
  let skipped = 0;

  for (const r of records) {
    const existing = await store.findBySourceUrl(r.sourceUrl);
    if (existing) { skipped++; continue; }

    const counsellor: Counsellor = {
      id: randomUUID(),
      name: r.name,
      normalizedName: r.name.toLowerCase().trim(),
      denomination: r.denomination,
      credentials: r.credentials,
      specialties: r.specialties,
      address: r.address,
      normalizedAddress: r.address.toLowerCase().trim(),
      phone: r.phone,
      email: '',
      source: 'web_research',
      verified: false,
      sourceUrl: r.sourceUrl,
      reviewCount: 0,
    };

    await store.create(counsellor);
    inserted++;
  }

  return { inserted, skipped };
}
