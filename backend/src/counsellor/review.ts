import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';
import type { ReviewStore, Review } from './review-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';
import { evaluate } from '../moderation/ruleset.ts';
import type { SlidingWindowLimiter } from '../auth/global-rate-limiter.ts';

interface ReviewDeps {
  counsellorStore: CounsellorStore;
  reviewStore: ReviewStore;
  sessionStore: SessionStore;
  userStore: UserStore;
  limiter?: SlidingWindowLimiter;
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

function renderReview(r: Review) {
  if (r.deletedAt) {
    return { id: r.id, counsellorId: r.counsellorId, authorId: null, body: r.deletedBy === 'moderator' ? '[removed by moderator]' : '[removed by author]', createdAt: r.createdAt.toISOString() };
  }
  return { id: r.id, counsellorId: r.counsellorId, authorId: r.authorId, body: r.body, createdAt: r.createdAt.toISOString() };
}

export function createPostReviewHandler({ counsellorStore, reviewStore, sessionStore, limiter }: ReviewDeps) {
  return async (req: IncomingMessage, res: ServerResponse, counsellorId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    if (limiter) {
      const { limited, retryAfterSecs } = limiter.checkAndRecord(session.userId + ':creates');
      if (limited) { res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSecs) }); res.end(JSON.stringify({ error: 'Too many creations. Try again later.' })); return; }
    }
    const counsellor = await counsellorStore.findById(counsellorId);
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
    const { body } = JSON.parse(data) as { body?: string };
    const text = String(body ?? '').trim();

    if (text.length < 20 || text.length > 4000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Review body must be between 20 and 4000 characters.' }));
      return;
    }

    const modResult = evaluate(text);
    if (modResult.verdict === 'reject') {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Content rejected by moderation.', reason: modResult.reason }));
      return;
    }

    const review = { id: randomUUID(), counsellorId, authorId: session.userId, body: text, createdAt: new Date() };
    await reviewStore.create(review);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderReview(review)));
  };
}

export function createGetReviewsHandler({ counsellorStore, reviewStore }: ReviewDeps) {
  return async (_req: IncomingMessage, res: ServerResponse, counsellorId: string): Promise<void> => {
    const counsellor = await counsellorStore.findById(counsellorId);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }
    const reviews = await reviewStore.findByCounsellor(counsellorId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reviews.map(renderReview)));
  };
}

export function createDeleteReviewHandler({ reviewStore, sessionStore, userStore }: ReviewDeps) {
  return async (req: IncomingMessage, res: ServerResponse, reviewId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const review = await reviewStore.findById(reviewId);
    if (!review) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    const user = await userStore.findById(session.userId);
    const isModerator = user?.role === 'moderator' || user?.role === 'admin';
    const isAuthor = review.authorId === session.userId;

    if (!isAuthor && !isModerator) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden.' }));
      return;
    }

    await reviewStore.softDelete(reviewId, isModerator && !isAuthor ? 'moderator' : 'author');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
