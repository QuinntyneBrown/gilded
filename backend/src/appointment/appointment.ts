import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppointmentStore } from './appointment-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';

interface AppointmentDeps {
  appointmentStore: AppointmentStore;
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

export function createCreateIntentHandler({ appointmentStore, sessionStore, userStore }: AppointmentDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
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
    const { counsellorId } = JSON.parse(data) as { counsellorId?: string };
    if (!counsellorId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'counsellorId required.' }));
      return;
    }
    const key = await ownerKey(session.userId, userStore);
    const intent = await appointmentStore.create(key, counsellorId);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: intent.id, counsellorId: intent.counsellorId, status: intent.status, createdAt: intent.createdAt.toISOString() }));
  };
}

export function createGetCurrentIntentHandler({ appointmentStore, sessionStore, userStore }: AppointmentDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const key = await ownerKey(session.userId, userStore);
    const intent = await appointmentStore.findCurrentByOwner(key);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(intent ? { id: intent.id, counsellorId: intent.counsellorId, status: intent.status, createdAt: intent.createdAt.toISOString() } : null));
  };
}

export function createUpdateIntentStatusHandler({ appointmentStore, sessionStore }: { appointmentStore: AppointmentStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse, intentId: string, status: 'booked' | 'cancelled'): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const intent = await appointmentStore.findById(intentId);
    if (!intent) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }
    await appointmentStore.updateStatus(intentId, status);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
