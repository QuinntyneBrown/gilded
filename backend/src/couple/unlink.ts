import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserStore } from '../auth/user-store.ts';
import type { CoupleStore } from './couple-store.ts';
import { getSessionUser } from '../auth/login.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { EventBus } from '../events.ts';

export interface UnlinkDeps {
  userStore: UserStore;
  coupleStore: CoupleStore;
  sessionStore: SessionStore;
  eventBus: EventBus;
}

export type UnlinkResult = 'ok' | 'not_coupled';

export async function unlinkCouple(
  userId: string,
  { userStore, coupleStore, eventBus }: { userStore: UserStore; coupleStore: CoupleStore; eventBus: EventBus },
): Promise<UnlinkResult> {
  const user = await userStore.findById(userId);
  if (!user?.coupleId) return 'not_coupled';

  const coupleId = user.coupleId;
  const spouseId = user.spouseId!;

  await userStore.clearCouple(userId);
  await userStore.clearCouple(spouseId);
  await coupleStore.deleteCouple(coupleId);

  eventBus.emit({ type: 'CoupleDissolved', coupleId, userIds: [userId, spouseId], at: new Date() });

  return 'ok';
}

export function createUnlinkHandler(deps: UnlinkDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await getSessionUser(req, deps);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not authenticated' }));
      return;
    }

    const result = await unlinkCouple(session.userId, deps);
    if (result === 'ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Couple dissolved.' }));
      return;
    }
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not in a couple.' }));
  };
}
