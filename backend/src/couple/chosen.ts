import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CoupleStore } from './couple-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';
import type { CounsellorStore } from '../counsellor/counsellor-store.ts';
import type { NotificationStore } from '../auth/notification-store.ts';
import type { Mailer } from '../auth/mailer.ts';

interface ChosenDeps {
  coupleStore: CoupleStore;
  counsellorStore: CounsellorStore;
  notificationStore: NotificationStore;
  sessionStore: SessionStore;
  userStore: UserStore;
  mailer: Mailer;
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

export function createChosenCounsellorHandler({ coupleStore, counsellorStore, notificationStore, sessionStore, userStore, mailer }: ChosenDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const user = await userStore.findById(session.userId);
    if (!user?.coupleId) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Must be in a couple to choose a counsellor.' }));
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

    const counsellor = await counsellorStore.findById(counsellorId);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Counsellor not found.' }));
      return;
    }

    await coupleStore.setChosenCounsellor(user.coupleId, counsellorId);

    if (user.spouseId) {
      const spouse = await userStore.findById(user.spouseId);
      if (spouse) {
        await notificationStore.push(spouse.id, `Your spouse chose ${counsellor.name} as your counsellor.`);
        mailer.sendChosenNotification(spouse.email, counsellor.name).catch(console.error);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, chosenCounsellorId: counsellorId }));
  };
}

export function createGetNotificationsHandler({ notificationStore, sessionStore }: { notificationStore: NotificationStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const sid = parseCookies(req.headers['cookie'] ?? '')['sid'] ?? '';
    const session = sid ? await sessionStore.findById(sid) : null;
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const notifs = await notificationStore.findUnread(session.userId);
    await notificationStore.markAllRead(session.userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notifs.map(n => ({ id: n.id, message: n.message, createdAt: n.createdAt.toISOString() }))));
  };
}
