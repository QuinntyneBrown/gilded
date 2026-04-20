// Acceptance Test
// Traces to: T-048
// Description: Validation layer — all body-reading handlers return 400 on invalid JSON;
//              no raw-SQL patterns; no innerHTML bindings in frontend.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { InMemorySessionStore } from './auth/session-store.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { InMemoryCounsellorStore } from './counsellor/counsellor-store.ts';
import { InMemoryReviewStore } from './counsellor/review-store.ts';
import { InMemoryRatingStore } from './counsellor/rating-store.ts';
import { InMemoryNoteStore } from './notes/note.ts';
import { createPostReviewHandler } from './counsellor/review.ts';
import { createPostCommentHandler } from './counsellor/comment.ts';
import { createRateCounsellorHandler } from './counsellor/rating.ts';
import { createSubmitCounsellorHandler } from './counsellor/submit.ts';
import { createCreatePrivateNoteHandler } from './notes/private-notes.ts';
import { createCreatePublicNoteHandler } from './notes/public-notes.ts';
import { createCreateSpouseNoteHandler } from './notes/spouse-notes.ts';

// ---------- shared test fixtures ----------

const SESSION_ID = 'test-sid';
const USER_ID = 'test-user-id';
const COUPLE_ID = 'test-couple-id';
const COUNSELLOR_ID = 'test-counsellor-id';
const REVIEW_ID = 'test-review-id';

const sessionStore = new InMemorySessionStore();
await sessionStore.create({ id: SESSION_ID, userId: USER_ID, expiresAt: new Date(Date.now() + 1e9), lastSeenAt: new Date() });

const userStore = new InMemoryUserStore();
await userStore.create({ id: USER_ID, email: 'test@example.com', passwordHash: 'x', state: 'active', createdAt: new Date(), coupleId: COUPLE_ID });

const counsellorStore = new InMemoryCounsellorStore();
await counsellorStore.create({ id: COUNSELLOR_ID, name: 'Dr Test', normalizedName: 'dr test', denomination: 'Test', credentials: [], specialties: [], address: '1 Main St', normalizedAddress: '1 main st', phone: '555', email: 'dr@test.com', source: 'web_research', verified: false, reviewCount: 0 });

const reviewStore = new InMemoryReviewStore();
await reviewStore.create({ id: REVIEW_ID, counsellorId: COUNSELLOR_ID, authorId: USER_ID, body: 'A sufficiently long review body for testing purposes.', createdAt: new Date() });

const ratingStore = new InMemoryRatingStore();
const noteStore = new InMemoryNoteStore();

// ---------- request/response helpers ----------

function makeReqWithSession(rawBody: string): IncomingMessage {
  const stream = new PassThrough() as unknown as IncomingMessage;
  (stream as unknown as { headers: unknown })['headers'] = {
    'content-type': 'application/json',
    'cookie': `sid=${SESSION_ID}`,
  };
  (stream as unknown as { method: unknown })['method'] = 'POST';
  (stream as unknown as { url: unknown })['url'] = '/';
  setImmediate(() => {
    (stream as unknown as PassThrough).push(rawBody);
    (stream as unknown as PassThrough).push(null);
  });
  return stream;
}

interface MockRes { status: number; writeHead(code: number, headers?: Record<string, string>): void; end(data?: string): void; }

function makeRes(): MockRes & ServerResponse {
  const m: MockRes = { status: 0, writeHead(c) { m.status = c; }, end() { return undefined; } };
  return m as unknown as MockRes & ServerResponse;
}

// ---------- handler validation tests ----------

test('POST review: invalid JSON → 400', async () => {
  const handler = createPostReviewHandler({ counsellorStore, reviewStore, sessionStore, userStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res, COUNSELLOR_ID);
  assert.equal(res.status, 400);
});

test('POST comment: invalid JSON → 400', async () => {
  const { InMemoryCommentStore } = await import('./counsellor/comment-store.ts');
  const commentStore = new InMemoryCommentStore();
  const handler = createPostCommentHandler({ commentStore, reviewStore, sessionStore, userStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res, REVIEW_ID);
  assert.equal(res.status, 400);
});

test('PUT rating: invalid JSON → 400', async () => {
  const handler = createRateCounsellorHandler({ counsellorStore, ratingStore, sessionStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res, COUNSELLOR_ID);
  assert.equal(res.status, 400);
});

test('POST submit counsellor: invalid JSON → 400', async () => {
  const handler = createSubmitCounsellorHandler({ counsellorStore, sessionStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res);
  assert.equal(res.status, 400);
});

test('POST private note: invalid JSON → 400', async () => {
  const handler = createCreatePrivateNoteHandler({ noteStore, sessionStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res);
  assert.equal(res.status, 400);
});

test('POST public note: invalid JSON → 400', async () => {
  const handler = createCreatePublicNoteHandler({ noteStore, sessionStore, userStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res);
  assert.equal(res.status, 400);
});

test('POST spouse note: invalid JSON → 400', async () => {
  const handler = createCreateSpouseNoteHandler({ noteStore, sessionStore, userStore });
  const res = makeRes();
  await handler(makeReqWithSession('{bad json}'), res);
  assert.equal(res.status, 400);
});

// ---------- static analysis guards ----------

function grepDir(dir: string, extensions: string[], pattern: RegExp): string[] {
  const matches: string[] = [];
  function walk(current: string): void {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!extensions.includes(entry.name.split('.').pop() ?? '')) continue;
      const content = readFileSync(full, 'utf-8');
      if (pattern.test(content)) matches.push(full);
    }
  }
  walk(dir);
  return matches;
}

test('no .raw( SQL patterns in backend src', () => {
  const backendSrc = fileURLToPath(new URL('..', import.meta.url));
  const hits = grepDir(backendSrc, ['ts'], /\.raw\s*\(/).filter(f => !f.endsWith('.test.ts'));
  assert.deepEqual(hits, [], `Found .raw( SQL calls in: ${hits.join(', ')}`);
});

test('no innerHTML= bindings in frontend src', () => {
  const frontendSrc = fileURLToPath(new URL('../../../frontend/src', import.meta.url));
  try {
    const hits = grepDir(frontendSrc, ['ts', 'html'], /innerHTML\s*=/);
    assert.deepEqual(hits, [], `Found innerHTML= in: ${hits.join(', ')}`);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw e;
  }
});
