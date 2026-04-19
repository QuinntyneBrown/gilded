import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserStore } from '../auth/user-store.ts';
import type { Mailer } from '../auth/mailer.ts';
import type { CoupleStore } from './couple-store.ts';
import { getSessionUser } from '../auth/login.ts';
import type { SessionStore } from '../auth/session-store.ts';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteDeps {
  userStore: UserStore;
  coupleStore: CoupleStore;
  mailer: Mailer;
  sessionStore: SessionStore;
}

export type SendResult = 'ok' | 'already_coupled' | 'self_invite';
export type AcceptResult = 'ok' | 'invalid' | 'already_coupled';

export async function sendInvite(
  inviterId: string,
  inviteeEmail: string,
  { userStore, coupleStore, mailer }: { userStore: UserStore; coupleStore: CoupleStore; mailer: Mailer },
): Promise<SendResult> {
  const inviter = await userStore.findById(inviterId);
  if (!inviter) return 'invalid' as unknown as SendResult;

  const normalizedEmail = inviteeEmail.toLowerCase().trim();
  if (inviter.email === normalizedEmail) return 'self_invite';
  if (inviter.coupleId) return 'already_coupled';

  await coupleStore.deleteInvitesByInviter(inviterId);

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await coupleStore.saveInvite({
    id: randomUUID(),
    inviterId,
    inviteeEmail: normalizedEmail,
    tokenHash,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  mailer.sendInvite(normalizedEmail, rawToken, inviter.email).catch(console.error);
  return 'ok';
}

export async function acceptInvite(
  rawToken: string,
  inviteeId: string,
  { userStore, coupleStore }: { userStore: UserStore; coupleStore: CoupleStore },
): Promise<AcceptResult> {
  const invitee = await userStore.findById(inviteeId);
  if (!invitee) return 'invalid';
  if (invitee.coupleId) return 'already_coupled';

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const invite = await coupleStore.findInviteByHash(tokenHash);
  if (!invite || invite.expiresAt < new Date()) return 'invalid';

  const inviter = await userStore.findById(invite.inviterId);
  if (!inviter) return 'invalid';
  if (inviter.coupleId) return 'already_coupled';

  const coupleId = randomUUID();
  await coupleStore.createCouple({ id: coupleId, createdAt: new Date() });
  await userStore.updateCouple(invite.inviterId, coupleId, inviteeId);
  await userStore.updateCouple(inviteeId, coupleId, invite.inviterId);
  await coupleStore.deleteInvite(tokenHash);

  return 'ok';
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

export function createInviteHandler(deps: InviteDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await getSessionUser(req, deps);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not authenticated' }));
      return;
    }

    let body: unknown;
    try { body = await readJson(req); } catch { body = {}; }
    const { email } = (body ?? {}) as Record<string, unknown>;

    if (typeof email !== 'string' || !email) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'email required' }));
      return;
    }

    const result = await sendInvite(session.userId, email, deps);

    if (result === 'ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Invitation sent.' }));
      return;
    }
    if (result === 'self_invite') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot invite yourself.' }));
      return;
    }
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Already in a couple.' }));
  };
}

export function createAcceptHandler(deps: InviteDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await getSessionUser(req, deps);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not authenticated' }));
      return;
    }

    let body: unknown;
    try { body = await readJson(req); } catch { body = {}; }
    const { token } = (body ?? {}) as Record<string, unknown>;

    if (typeof token !== 'string' || !token) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'token required' }));
      return;
    }

    const result = await acceptInvite(token, session.userId, deps);

    if (result === 'ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Couple linked.' }));
      return;
    }
    if (result === 'already_coupled') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Already in a couple.' }));
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired invitation.' }));
  };
}
