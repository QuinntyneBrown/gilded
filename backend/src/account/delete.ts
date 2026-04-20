import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserStore } from '../auth/user-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { Mailer } from '../auth/mailer.ts';
import { getSessionUser } from '../auth/login.ts';

export interface DeleteAccountDeps {
  userStore: UserStore;
  sessionStore: SessionStore;
  mailer: Mailer;
}

export function createDeleteAccountHandler({ userStore, sessionStore, mailer }: DeleteAccountDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await getSessionUser(req, { userStore, sessionStore });
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not authenticated' }));
      return;
    }

    const user = await userStore.findById(session.userId);
    if (!user) { res.writeHead(404); res.end(); return; }

    await userStore.requestDeletion(session.userId, new Date());
    await sessionStore.deleteByUserId(session.userId);
    await mailer.sendDeletionConfirmation(user.email);

    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Account deletion scheduled.' }));
  };
}
