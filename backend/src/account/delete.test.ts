// Acceptance Test
// Traces to: T-052
// Description: Account deletion — POST /api/me/delete disables login and schedules purge;
//              worker after 30 days hard-deletes private data, anonymizes public content,
//              dissolves couple, removes user record.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDeleteAccountHandler } from './delete.ts';
import { runDeletionWorker } from './deletion-worker.ts';
import { InMemoryUserStore } from '../auth/user-store.ts';
import { InMemorySessionStore } from '../auth/session-store.ts';
import { InMemoryCoupleStore } from '../couple/couple-store.ts';
import { InMemoryNoteStore } from '../notes/note.ts';
import { InMemoryReviewStore } from '../counsellor/review-store.ts';
import { InMemoryCommentStore } from '../counsellor/comment-store.ts';
import { EventBus } from '../events.ts';
import { signupUser } from '../auth/signup.ts';
import { verifyEmail } from '../auth/verify.ts';
import { loginUser } from '../auth/login.ts';
import type { Mailer } from '../auth/mailer.ts';

const PASSWORD = 'ValidPass123!';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type SentEmail = { type: string; email: string };
function fakeMailer(): { mailer: Mailer; sent: SentEmail[] } {
  const sent: SentEmail[] = [];
  return {
    sent,
    mailer: {
      sendVerification: (email, token) => { sent.push({ type: 'verification', email }); void token; return Promise.resolve(); },
      sendReset: () => Promise.resolve(),
      sendInvite: () => Promise.resolve(),
      sendRejection: () => Promise.resolve(),
      sendChosenNotification: () => Promise.resolve(),
      sendDeletionConfirmation: (email) => { sent.push({ type: 'deletion', email }); return Promise.resolve(); },
    },
  };
}

function makeReq(sid?: string): IncomingMessage {
  const stream = new PassThrough() as unknown as IncomingMessage;
  (stream as unknown as Record<string, unknown>).headers = sid ? { cookie: `sid=${sid}` } : {};
  (stream as unknown as Record<string, unknown>).method = 'POST';
  (stream as unknown as Record<string, unknown>).url = '/api/me/delete';
  setImmediate(() => { (stream as unknown as PassThrough).push(null); });
  return stream;
}

interface MockRes { status: number; body: string; writeHead(code: number, h?: unknown): void; end(d?: string): void; }
function makeRes(): MockRes & ServerResponse {
  const m: MockRes = { status: 0, body: '', writeHead(c) { m.status = c; }, end(d = '') { m.body += d; } };
  return m as unknown as MockRes & ServerResponse;
}

async function signupAndActivate(email: string, userStore: InMemoryUserStore, mailer: Mailer): Promise<string> {
  const sent: { email: string; token: string }[] = [];
  const capturingMailer = { ...mailer, sendVerification: (e: string, t: string) => { sent.push({ email: e, token: t }); return Promise.resolve(); } };
  await signupUser(email, PASSWORD, { userStore, mailer: capturingMailer });
  await verifyEmail(sent[0].token, { userStore, mailer: capturingMailer });
  return (await userStore.findByEmail(email))!.id;
}

// ── POST /api/me/delete ────────────────────────────────────────────────────

describe('POST /api/me/delete', () => {
  test('sets user state to pending_deletion', async () => {
    const userStore = new InMemoryUserStore();
    const sessionStore = new InMemorySessionStore();
    const { mailer } = fakeMailer();

    const userId = await signupAndActivate('del1@example.com', userStore, mailer);
    const login = await loginUser('del1@example.com', PASSWORD, { userStore, sessionStore });
    assert.equal(login.outcome, 'ok');
    const { sessionId } = login as { outcome: 'ok'; sessionId: string };

    const handler = createDeleteAccountHandler({ userStore, sessionStore, mailer });
    const res = makeRes();
    await handler(makeReq(sessionId), res);

    assert.equal(res.status, 202);
    const user = await userStore.findById(userId);
    assert.equal(user!.state, 'pending_deletion');
  });

  test('invalidates all sessions on deletion request', async () => {
    const userStore = new InMemoryUserStore();
    const sessionStore = new InMemorySessionStore();
    const { mailer } = fakeMailer();

    await signupAndActivate('del2@example.com', userStore, mailer);
    const login1 = await loginUser('del2@example.com', PASSWORD, { userStore, sessionStore });
    const login2 = await loginUser('del2@example.com', PASSWORD, { userStore, sessionStore });
    const sid1 = (login1 as { outcome: 'ok'; sessionId: string }).sessionId;
    const sid2 = (login2 as { outcome: 'ok'; sessionId: string }).sessionId;

    const handler = createDeleteAccountHandler({ userStore, sessionStore, mailer });
    await handler(makeReq(sid1), makeRes());

    assert.equal(await sessionStore.findById(sid1), null);
    assert.equal(await sessionStore.findById(sid2), null);
  });

  test('sends deletion confirmation email', async () => {
    const userStore = new InMemoryUserStore();
    const sessionStore = new InMemorySessionStore();
    const { mailer, sent } = fakeMailer();

    await signupAndActivate('del3@example.com', userStore, mailer);
    const login = await loginUser('del3@example.com', PASSWORD, { userStore, sessionStore });
    const { sessionId } = login as { outcome: 'ok'; sessionId: string };

    const handler = createDeleteAccountHandler({ userStore, sessionStore, mailer });
    await handler(makeReq(sessionId), makeRes());

    assert.ok(sent.some(e => e.type === 'deletion' && e.email === 'del3@example.com'));
  });

  test('returns 401 when not authenticated', async () => {
    const userStore = new InMemoryUserStore();
    const sessionStore = new InMemorySessionStore();
    const { mailer } = fakeMailer();
    const handler = createDeleteAccountHandler({ userStore, sessionStore, mailer });
    const res = makeRes();
    await handler(makeReq(), res);
    assert.equal(res.status, 401);
  });

  test('login is blocked immediately after deletion request', async () => {
    const userStore = new InMemoryUserStore();
    const sessionStore = new InMemorySessionStore();
    const { mailer } = fakeMailer();

    await signupAndActivate('del4@example.com', userStore, mailer);
    const login = await loginUser('del4@example.com', PASSWORD, { userStore, sessionStore });
    const { sessionId } = login as { outcome: 'ok'; sessionId: string };

    const handler = createDeleteAccountHandler({ userStore, sessionStore, mailer });
    await handler(makeReq(sessionId), makeRes());

    const retryLogin = await loginUser('del4@example.com', PASSWORD, { userStore, sessionStore });
    assert.notEqual(retryLogin.outcome, 'ok');
  });
});

// ── Deletion worker ───────────────────────────────────────────────────────

describe('deletion worker', () => {
  async function setupUser(email: string) {
    const userStore = new InMemoryUserStore();
    const sessionStore = new InMemorySessionStore();
    const coupleStore = new InMemoryCoupleStore();
    const noteStore = new InMemoryNoteStore();
    const reviewStore = new InMemoryReviewStore();
    const commentStore = new InMemoryCommentStore();
    const eventBus = new EventBus();
    const { mailer } = fakeMailer();

    const userId = await signupAndActivate(email, userStore, mailer);
    await userStore.requestDeletion(userId, new Date(Date.now() - THIRTY_DAYS_MS - 1000));

    return { userId, userStore, sessionStore, coupleStore, noteStore, reviewStore, commentStore, eventBus };
  }

  test('does not delete user if 30 days have not passed', async () => {
    const userStore = new InMemoryUserStore();
    const { mailer } = fakeMailer();
    const userId = await signupAndActivate('nd1@example.com', userStore, mailer);
    await userStore.requestDeletion(userId, new Date());

    await runDeletionWorker({
      userStore,
      noteStore: new InMemoryNoteStore(),
      reviewStore: new InMemoryReviewStore(),
      commentStore: new InMemoryCommentStore(),
      coupleStore: new InMemoryCoupleStore(),
      eventBus: new EventBus(),
    }, new Date(Date.now() + (29 * 24 * 60 * 60 * 1000)));

    assert.ok(await userStore.findById(userId), 'user should not be deleted before 30 days');
  });

  test('hard-deletes private notes after 30 days', async () => {
    const { userId, ...deps } = await setupUser('w1@example.com');
    const noteId = 'note-priv-1';
    await deps.noteStore.create({ id: noteId, authorId: userId, visibility: 'private', body: 'secret', createdAt: new Date(), updatedAt: new Date() });

    await runDeletionWorker(deps);
    assert.equal(await deps.noteStore.findById(noteId), null);
  });

  test('hard-deletes spouse notes after 30 days', async () => {
    const { userId, ...deps } = await setupUser('w2@example.com');
    const noteId = 'note-spouse-1';
    await deps.noteStore.create({ id: noteId, authorId: userId, coupleId: 'couple-x', visibility: 'spouse', body: 'shared', createdAt: new Date(), updatedAt: new Date() });

    await runDeletionWorker(deps);
    assert.equal(await deps.noteStore.findById(noteId), null);
  });

  test('anonymizes public notes (authorId becomes empty string)', async () => {
    const { userId, ...deps } = await setupUser('w3@example.com');
    const noteId = 'note-pub-1';
    await deps.noteStore.create({ id: noteId, authorId: userId, visibility: 'public', body: 'public thought', createdAt: new Date(), updatedAt: new Date() });

    await runDeletionWorker(deps);
    const note = await deps.noteStore.findById(noteId);
    assert.ok(note, 'public note should still exist');
    assert.equal(note!.authorId, '');
  });

  test('anonymizes reviews (authorId becomes empty string)', async () => {
    const { userId, ...deps } = await setupUser('w4@example.com');
    const reviewId = 'review-1';
    await deps.reviewStore.create({ id: reviewId, counsellorId: 'c-1', authorId: userId, body: 'great', createdAt: new Date() });

    await runDeletionWorker(deps);
    const review = await deps.reviewStore.findById(reviewId);
    assert.ok(review, 'review should still exist');
    assert.equal(review!.authorId, '');
  });

  test('anonymizes comments (authorId becomes empty string)', async () => {
    const { userId, ...deps } = await setupUser('w5@example.com');
    const commentId = 'comment-1';
    await deps.commentStore.create({ id: commentId, reviewId: 'r-1', authorId: userId, body: 'agreed', createdAt: new Date() });

    await runDeletionWorker(deps);
    const comment = await deps.commentStore.findById(commentId);
    assert.ok(comment, 'comment should still exist');
    assert.equal(comment!.authorId, '');
  });

  test('dissolves couple if user is in one', async () => {
    const { userId, userStore, coupleStore, eventBus } = await setupUser('w6@example.com');
    const spouseId = 'spouse-id';
    const coupleId = 'couple-1';
    await userStore.create({ id: spouseId, email: 'spouse@example.com', passwordHash: 'x', state: 'active', createdAt: new Date() });
    await coupleStore.createCouple({ id: coupleId, createdAt: new Date() });
    await userStore.updateCouple(userId, coupleId, spouseId);
    await userStore.updateCouple(spouseId, coupleId, userId);

    await runDeletionWorker({ userStore, noteStore: new InMemoryNoteStore(), reviewStore: new InMemoryReviewStore(), commentStore: new InMemoryCommentStore(), coupleStore, eventBus });

    const spouse = await userStore.findById(spouseId);
    assert.equal(spouse!.coupleId, undefined);
    assert.equal(await coupleStore.findById(coupleId), null);
  });

  test('deletes user record after 30 days', async () => {
    const { userId, ...deps } = await setupUser('w7@example.com');
    await runDeletionWorker(deps);
    assert.equal(await deps.userStore.findById(userId), null);
  });
});
