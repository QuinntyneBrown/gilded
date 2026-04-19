import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { CounsellorStore } from './counsellor-store.ts';
import type { RatingStore } from './rating-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import { parseBody } from '../parse-body.ts';

const RatingSchema = z.object({ stars: z.number().int().min(1).max(5) });

interface RatingDeps {
  counsellorStore: CounsellorStore;
  ratingStore: RatingStore;
  sessionStore: SessionStore;
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(p => p.trim().split('=').map(s => decodeURIComponent(s.trim())) as [string, string])
  );
}

export function createRateCounsellorHandler({ counsellorStore, ratingStore, sessionStore }: RatingDeps) {
  return async (req: IncomingMessage, res: ServerResponse, id: string): Promise<void> => {
    const sid = parseCookies(req.headers['cookie'] ?? '')['sid'] ?? '';
    const session = sid ? await sessionStore.findById(sid) : null;
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }

    const counsellor = await counsellorStore.findById(id);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    const parsed = await parseBody(req, res, RatingSchema);
    if (!parsed) return;
    const { stars } = parsed;

    await ratingStore.upsert(session.userId, id, stars);

    const all = await ratingStore.findByCounsellor(id);
    const reviewCount = all.length;
    const avg = all.reduce((sum, r) => sum + r.stars, 0) / reviewCount;
    const rating = Math.round(avg * 10) / 10;
    await counsellorStore.updateRatingAggregate(id, rating, reviewCount);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rating, reviewCount }));
  };
}
