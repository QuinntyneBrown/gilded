import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';
import type { SessionStore } from '../auth/session-store.ts';

interface SubmitDeps {
  counsellorStore: CounsellorStore;
  sessionStore: SessionStore;
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(p => p.trim().split('=').map(s => decodeURIComponent(s.trim())) as [string, string])
  );
}

export function createSubmitCounsellorHandler({ counsellorStore, sessionStore }: SubmitDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const cookieHeader = req.headers['cookie'] ?? '';
    const cookies = parseCookies(cookieHeader);
    const sid = cookies['sid'] ?? '';
    const session = sid ? await sessionStore.findById(sid) : null;
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }

    let data = '';
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const body = JSON.parse(data) as Record<string, unknown>;

    const name = String(body['name'] ?? '').trim();
    const denomination = String(body['denomination'] ?? '').trim();
    const address = String(body['address'] ?? '').trim();
    const phone = String(body['phone'] ?? '').trim();
    const email = String(body['email'] ?? '').trim();

    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'name is required.' }));
      return;
    }
    if (!denomination) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'denomination is required.' }));
      return;
    }
    if (!address) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'address is required.' }));
      return;
    }
    if (!phone && !email) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'At least one contact method (phone or email) is required.' }));
      return;
    }

    const normalizedName = name.toLowerCase();
    const normalizedAddress = address.toLowerCase();
    const dup = await counsellorStore.findDuplicate(normalizedName, normalizedAddress, phone, email);
    if (dup) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'A matching counsellor already exists.', existingId: dup.id }));
      return;
    }

    const id = randomUUID();
    await counsellorStore.create({
      id,
      name,
      normalizedName,
      denomination,
      credentials: (body['credentials'] as string[]) ?? [],
      specialties: (body['specialties'] as string[]) ?? [],
      address,
      normalizedAddress,
      phone,
      email,
      website: body['website'] as string | undefined,
      bookingLink: body['bookingLink'] as string | undefined,
      source: 'user_submitted',
      verified: false,
      submittedBy: session.userId,
      reviewCount: 0,
      moderationState: 'pending',
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id }));
  };
}
