import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';
import type { RatingStore } from './rating-store.ts';
import type { SessionStore } from '../auth/session-store.ts';

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

    let data = '';
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const body = JSON.parse(data) as { stars?: unknown };
    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'stars must be an integer between 1 and 5.' }));
      return;
    }

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
