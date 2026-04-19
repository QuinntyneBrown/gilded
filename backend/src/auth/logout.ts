import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SessionStore } from './session-store.ts';

export function createLogoutHandler({ sessionStore }: { sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const cookie = req.headers.cookie ?? '';
    const sid = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('sid='))?.slice(4);
    if (sid) await sessionStore.delete(sid);
    res.writeHead(204, { 'Set-Cookie': 'sid=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/' });
    res.end();
  };
}
