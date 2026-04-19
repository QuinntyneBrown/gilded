import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CommentStore, Comment } from './comment-store.ts';
import type { ReviewStore } from './review-store.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';
import { evaluate } from '../moderation/ruleset.ts';
import type { SlidingWindowLimiter } from '../auth/global-rate-limiter.ts';

interface CommentDeps {
  commentStore: CommentStore;
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

function renderComment(c: Comment) {
  if (c.deletedAt) {
    return { id: c.id, reviewId: c.reviewId, authorId: null, body: c.deletedBy === 'moderator' ? '[removed by moderator]' : '[removed by author]', createdAt: c.createdAt.toISOString() };
  }
  return { id: c.id, reviewId: c.reviewId, authorId: c.authorId, body: c.body, createdAt: c.createdAt.toISOString() };
}

export function createPostCommentHandler({ commentStore, reviewStore, sessionStore, limiter }: CommentDeps) {
  return async (req: IncomingMessage, res: ServerResponse, reviewId: string): Promise<void> => {
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
    const review = await reviewStore.findById(reviewId);
    if (!review) {
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

    if (text.length < 1 || text.length > 1000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Comment body must be between 1 and 1000 characters.' }));
      return;
    }

    const modResult = evaluate(text);
    if (modResult.verdict === 'reject') {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Content rejected by moderation.', reason: modResult.reason }));
      return;
    }

    const comment = { id: randomUUID(), reviewId, authorId: session.userId, body: text, createdAt: new Date() };
    await commentStore.create(comment);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderComment(comment)));
  };
}

export function createGetCommentsHandler({ commentStore, reviewStore }: CommentDeps) {
  return async (_req: IncomingMessage, res: ServerResponse, reviewId: string): Promise<void> => {
    const review = await reviewStore.findById(reviewId);
    if (!review) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }
    const comments = await commentStore.findByReview(reviewId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(comments.map(renderComment)));
  };
}

export function createDeleteCommentHandler({ commentStore, sessionStore, userStore }: CommentDeps) {
  return async (req: IncomingMessage, res: ServerResponse, commentId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required.' }));
      return;
    }
    const comment = await commentStore.findById(commentId);
    if (!comment) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    const user = await userStore.findById(session.userId);
    const isModerator = user?.role === 'moderator' || user?.role === 'admin';
    const isAuthor = comment.authorId === session.userId;

    if (!isAuthor && !isModerator) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden.' }));
      return;
    }

    await commentStore.softDelete(commentId, isModerator && !isAuthor ? 'moderator' : 'author');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
