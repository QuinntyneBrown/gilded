import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ShortlistStore } from './shortlist-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';

interface ShortlistDeps {
  shortlistStore: ShortlistStore;
  sessionStore: SessionStore;
  userStore: UserStore;
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(p => p.trim().split('=').map(s => decodeURIComponent(s.trim())) as [string, string])
  );
}

async function requireSession(req: IncomingMessage, sessionStore: SessionStore) {
  const sid = parseCookies(req.headers['cookie'] ?? '')['sid'] ?? '';
  return sid ? sessionStore.findById(sid) : null;
}

async function ownerKey(userId: string, userStore: UserStore): Promise<string> {
  const user = await userStore.findById(userId);
  return user?.coupleId ?? userId;
}

export function createAddToShortlistHandler({ shortlistStore, sessionStore, userStore }: ShortlistDeps) {
  return async (req: IncomingMessage, res: ServerResponse, counsellorId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const key = await ownerKey(session.userId, userStore);
    const result = await shortlistStore.add(key, counsellorId, session.userId);
    res.writeHead(result === 'created' ? 201 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}

export function createRemoveFromShortlistHandler({ shortlistStore, sessionStore, userStore }: ShortlistDeps) {
  return async (req: IncomingMessage, res: ServerResponse, counsellorId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const key = await ownerKey(session.userId, userStore);
    await shortlistStore.remove(key, counsellorId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}

export function createGetShortlistHandler({ shortlistStore, sessionStore, userStore }: ShortlistDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const key = await ownerKey(session.userId, userStore);
    const items = await shortlistStore.findByOwner(key);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items.map(i => ({ counsellorId: i.counsellorId, addedAt: i.addedAt.toISOString(), addedBy: i.addedBy }))));
  };
}
