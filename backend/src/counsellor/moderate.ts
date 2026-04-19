import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';
import type { Mailer } from '../auth/mailer.ts';

interface ModerateDeps {
  counsellorStore: CounsellorStore;
  sessionStore: SessionStore;
  userStore: UserStore;
  mailer: Mailer;
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(p => p.trim().split('=').map(s => decodeURIComponent(s.trim())) as [string, string])
  );
}

async function requireModerator(req: IncomingMessage, sessionStore: SessionStore, userStore: UserStore) {
  const sid = parseCookies(req.headers['cookie'] ?? '')['sid'] ?? '';
  const session = sid ? await sessionStore.findById(sid) : null;
  if (!session) return null;
  const user = await userStore.findById(session.userId);
  if (!user || (user.role !== 'moderator' && user.role !== 'admin')) return null;
  return user;
}

export function createListPendingHandler({ counsellorStore, sessionStore, userStore }: ModerateDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const user = await requireModerator(req, sessionStore, userStore);
    if (!user) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden.' }));
      return;
    }
    const pending = await counsellorStore.findPending();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(pending.map(c => ({ id: c.id, name: c.name, denomination: c.denomination, address: c.address, phone: c.phone, email: c.email, credentials: c.credentials, submittedBy: c.submittedBy ?? null }))));
  };
}

export function createApproveHandler({ counsellorStore, sessionStore, userStore }: ModerateDeps) {
  return async (req: IncomingMessage, res: ServerResponse, id: string): Promise<void> => {
    const user = await requireModerator(req, sessionStore, userStore);
    if (!user) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden.' }));
      return;
    }
    const counsellor = await counsellorStore.findById(id);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }
    await counsellorStore.updateModerationState(id, 'approved', user.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}

export function createRejectHandler({ counsellorStore, sessionStore, userStore, mailer }: ModerateDeps) {
  return async (req: IncomingMessage, res: ServerResponse, id: string): Promise<void> => {
    const user = await requireModerator(req, sessionStore, userStore);
    if (!user) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden.' }));
      return;
    }
    const counsellor = await counsellorStore.findById(id);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    let data = '';
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const body = JSON.parse(data) as { reason?: string };
    const reason = String(body.reason ?? '').trim();
    if (!reason) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'reason is required.' }));
      return;
    }

    await counsellorStore.updateModerationState(id, 'rejected', user.id);

    if (counsellor.submittedBy) {
      const submitter = await userStore.findById(counsellor.submittedBy);
      if (submitter) {
        await mailer.sendRejection(submitter.email, counsellor.name, reason).catch(() => undefined);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
