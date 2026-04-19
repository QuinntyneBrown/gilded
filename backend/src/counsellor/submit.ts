import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { CounsellorStore } from './counsellor-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import { parseBody } from '../parse-body.ts';

const SubmitCounsellorSchema = z.object({
  name: z.string(),
  denomination: z.string(),
  address: z.string(),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  credentials: z.array(z.string()).optional().default([]),
  specialties: z.array(z.string()).optional().default([]),
  website: z.string().optional(),
  bookingLink: z.string().optional(),
});

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

    const parsed = await parseBody(req, res, SubmitCounsellorSchema);
    if (!parsed) return;

    const name = parsed.name.trim();
    const denomination = parsed.denomination.trim();
    const address = parsed.address.trim();
    const phone = parsed.phone.trim();
    const email = parsed.email.trim();

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
      credentials: parsed.credentials,
      specialties: parsed.specialties,
      address,
      normalizedAddress,
      phone,
      email,
      website: parsed.website,
      bookingLink: parsed.bookingLink,
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
